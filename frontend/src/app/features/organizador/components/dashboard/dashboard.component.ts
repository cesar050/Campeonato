import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizadorService, Campeonato, Inscripcion } from '../../services/organizador.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmDialogComponent, ToastComponent, ImagePlaceholderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Estados
  loading = signal(true);
  
  // Datos
  misCampeonatos = signal<Campeonato[]>([]);
  campeonatoSeleccionado = signal<number | null>(null);
  
  // Diálogos y notificaciones
  showConfirmAprobar = signal(false);
  showConfirmRechazar = signal(false);
  inscripcionSeleccionada = signal<Inscripcion | null>(null);
  motivoRechazo = signal('');
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');
  
  // Campeonato actual (computed)
  campeonato = computed(() => {
    const id = this.campeonatoSeleccionado();
    if (!id) return null;
    return this.misCampeonatos().find(c => c.id_campeonato === id) || null;
  });

  stats = signal({
    equiposInscritos: 0,
    equiposPendientes: 0,
    partidosProgramados: 0,
    proximoPartidoDias: 0
  });

  proximosPartidos = signal<any[]>([]);
  solicitudesPendientes = signal<Inscripcion[]>([]);
  equiposDelCampeonato = signal<any[]>([]);

  constructor(private organizadorService: OrganizadorService) {}

  ngOnInit(): void {
    this.cargarMisCampeonatos();
  }

  cargarMisCampeonatos(): void {
    this.loading.set(true);
    
    this.organizadorService.obtenerMisCampeonatos().subscribe({
      next: (campeonatos) => {
        this.misCampeonatos.set(campeonatos);
        
        // Seleccionar el primer campeonato por defecto
        if (campeonatos.length > 0) {
          this.campeonatoSeleccionado.set(campeonatos[0].id_campeonato);
          this.cargarDatosCampeonato(campeonatos[0].id_campeonato);
        } else {
          this.loading.set(false);
        }
      },
      error: (error) => {
        console.error('Error al cargar campeonatos:', error);
        this.loading.set(false);
      }
    });
  }

  onCampeonatoChange(id: number): void {
    if (id) {
      this.campeonatoSeleccionado.set(id);
      this.cargarDatosCampeonato(id);
    }
  }

  cambiarCampeonato(): void {
    const id = this.campeonatoSeleccionado();
    if (id) {
      this.cargarDatosCampeonato(id);
    }
  }

  cargarDatosCampeonato(idCampeonato: number): void {
    this.loading.set(true);

    // Cargar inscripciones primero
    this.organizadorService.obtenerInscripcionesPorCampeonato(idCampeonato).subscribe({
      next: (inscripcionesResponse) => {
        const inscripciones = inscripcionesResponse.inscripciones || [];
        
        // Contar equipos aprobados directamente del array
        const equiposAprobados = inscripciones.filter((i: Inscripcion) => i.estado_inscripcion === 'aprobado').length;
        const equiposPendientes = inscripciones.filter((i: Inscripcion) => i.estado_inscripcion === 'pendiente').length;
        
        this.stats.update(stats => ({
          ...stats,
          equiposInscritos: inscripcionesResponse.total_aprobados ?? equiposAprobados,
          equiposPendientes: inscripcionesResponse.total_pendientes ?? equiposPendientes
        }));

        this.solicitudesPendientes.set(
          inscripciones.filter((i: Inscripcion) => i.estado_inscripcion === 'pendiente').slice(0, 5)
        );
        
        // Luego cargar equipos del campeonato
        this.organizadorService.obtenerEquiposPorCampeonato(idCampeonato, 'aprobado').subscribe({
          next: (equiposResponse) => {
            const equipos = equiposResponse.equipos || equiposResponse || [];
            this.equiposDelCampeonato.set(Array.isArray(equipos) ? equipos : []);
            
            // Actualizar el conteo de equipos inscritos con el número real de equipos aprobados
            this.stats.update(stats => ({
              ...stats,
              equiposInscritos: Array.isArray(equipos) ? equipos.length : 0
            }));

            // Cargar partidos
            this.organizadorService.obtenerPartidosPorCampeonato(idCampeonato).subscribe({
              next: (partidosResponse) => {
                const partidos = partidosResponse.partidos || [];
                
                // Enriquecer partidos con información de equipos
                const partidosEnriquecidos = partidos.map((p: any) => {
                  const equipoLocal = this.equiposDelCampeonato().find(e => e.id_equipo === p.id_equipo_local);
                  const equipoVisitante = this.equiposDelCampeonato().find(e => e.id_equipo === p.id_equipo_visitante);
                  
                  return {
                    ...p,
                    equipo_local: equipoLocal,
                    equipo_visitante: equipoVisitante
                  };
                });
                
                this.stats.update(stats => ({
                  ...stats,
                  partidosProgramados: partidosEnriquecidos.filter((p: any) => p.estado === 'programado').length
                }));

                const proximosPartidos = partidosEnriquecidos
                  .filter((p: any) => p.estado === 'programado')
                  .sort((a: any, b: any) => new Date(a.fecha_partido).getTime() - new Date(b.fecha_partido).getTime())
                  .slice(0, 5);

                this.proximosPartidos.set(proximosPartidos);

                if (proximosPartidos.length > 0) {
                  const dias = this.calcularDiasRestantes(proximosPartidos[0].fecha_partido);
                  this.stats.update(stats => ({
                    ...stats,
                    proximoPartidoDias: dias
                  }));
                }

                this.loading.set(false);
              },
              error: (error) => {
                console.error('Error al cargar partidos:', error);
                this.loading.set(false);
              }
            });
          },
          error: (error) => {
            console.error('Error al cargar equipos:', error);
            this.loading.set(false);
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar inscripciones:', error);
        this.loading.set(false);
      }
    });
  }

  aprobarSolicitud(inscripcion: Inscripcion): void {
    this.inscripcionSeleccionada.set(inscripcion);
    this.showConfirmAprobar.set(true);
  }

  confirmAprobar(confirmed: boolean): void {
    if (confirmed && this.inscripcionSeleccionada()) {
      const inscripcion = this.inscripcionSeleccionada()!;
      this.organizadorService.cambiarEstadoInscripcion(inscripcion.id, 'aprobado').subscribe({
        next: () => {
          const id = this.campeonatoSeleccionado();
          if (id) {
            this.cargarDatosCampeonato(id);
            this.mostrarToast('success', 'Éxito', `Inscripción de ${inscripcion.equipo?.nombre} aprobada`);
          }
        },
        error: (error) => {
          console.error('Error al aprobar:', error);
          this.mostrarToast('error', 'Error', 'No se pudo aprobar la inscripción');
        }
      });
    }
    this.showConfirmAprobar.set(false);
    this.inscripcionSeleccionada.set(null);
  }

  rechazarSolicitud(inscripcion: Inscripcion): void {
    this.inscripcionSeleccionada.set(inscripcion);
    this.motivoRechazo.set('');
    this.showConfirmRechazar.set(true);
  }

  confirmRechazar(data: { confirmed: boolean; inputValue?: string }): void {
    if (data.confirmed && data.inputValue && this.inscripcionSeleccionada()) {
      const inscripcion = this.inscripcionSeleccionada()!;
      this.organizadorService.cambiarEstadoInscripcion(inscripcion.id, 'rechazado', data.inputValue).subscribe({
        next: () => {
          const id = this.campeonatoSeleccionado();
          if (id) {
            this.cargarDatosCampeonato(id);
            this.mostrarToast('success', 'Éxito', `Inscripción de ${inscripcion.equipo?.nombre} rechazada`);
          }
        },
        error: (error) => {
          console.error('Error al rechazar:', error);
          this.mostrarToast('error', 'Error', 'No se pudo rechazar la inscripción');
        }
      });
    }
    this.showConfirmRechazar.set(false);
    this.inscripcionSeleccionada.set(null);
    this.motivoRechazo.set('');
  }

  mostrarToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType.set(type);
    this.toastTitle.set(title);
    this.toastMessage.set(message);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 5000);
  }

  calcularDiasRestantes(fecha: string): number {
    const fechaPartido = new Date(fecha);
    const hoy = new Date();
    const diff = fechaPartido.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstadoBadge(estado: string): string {
    const badges: { [key: string]: string } = {
      'planificacion': 'PLANIFICACIÓN',
      'en_curso': 'EN CURSO',
      'finalizado': 'FINALIZADO'
    };
    return badges[estado] || estado.toUpperCase();
  }
}