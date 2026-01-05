import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizadorService, Campeonato, Inscripcion } from '../../services/organizador.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Estados
  loading = signal(true);
  
  // Datos
  misCampeonatos = signal<Campeonato[]>([]);
  campeonatoSeleccionado = signal<number | null>(null);
  
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

  cambiarCampeonato(): void {
    const id = this.campeonatoSeleccionado();
    if (id) {
      this.cargarDatosCampeonato(id);
    }
  }

  cargarDatosCampeonato(idCampeonato: number): void {
    this.loading.set(true);

    // Cargar inscripciones
    this.organizadorService.obtenerInscripcionesPorCampeonato(idCampeonato).subscribe({
      next: (response) => {
        const inscripciones = response.inscripciones || [];
        
        this.stats.update(stats => ({
          ...stats,
          equiposInscritos: response.total_aprobados || 0,
          equiposPendientes: response.total_pendientes || 0
        }));

        this.solicitudesPendientes.set(
          inscripciones.filter((i: Inscripcion) => i.estado_inscripcion === 'pendiente').slice(0, 5)
        );
      },
      error: (error) => console.error('Error al cargar inscripciones:', error)
    });

    // Cargar partidos
    this.organizadorService.obtenerPartidosPorCampeonato(idCampeonato).subscribe({
      next: (response) => {
        const partidos = response.partidos || [];
        
        this.stats.update(stats => ({
          ...stats,
          partidosProgramados: partidos.filter((p: any) => p.estado === 'programado').length
        }));

        const proximosPartidos = partidos
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
  }

  aprobarSolicitud(inscripcion: Inscripcion): void {
    if (confirm(`¿Aprobar inscripción de ${inscripcion.equipo?.nombre}?`)) {
      this.organizadorService.cambiarEstadoInscripcion(inscripcion.id, 'aprobado').subscribe({
        next: () => {
          const id = this.campeonatoSeleccionado();
          if (id) this.cargarDatosCampeonato(id);
        },
        error: (error) => {
          console.error('Error al aprobar:', error);
          alert('Error al aprobar equipo');
        }
      });
    }
  }

  rechazarSolicitud(inscripcion: Inscripcion): void {
    const motivo = prompt('Motivo del rechazo:');
    if (motivo) {
      this.organizadorService.cambiarEstadoInscripcion(inscripcion.id, 'rechazado', motivo).subscribe({
        next: () => {
          const id = this.campeonatoSeleccionado();
          if (id) this.cargarDatosCampeonato(id);
        },
        error: (error) => {
          console.error('Error al rechazar:', error);
          alert('Error al rechazar equipo');
        }
      });
    }
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