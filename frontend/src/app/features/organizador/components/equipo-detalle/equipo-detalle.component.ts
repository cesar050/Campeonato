import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { OrganizadorService, Equipo, Jugador, Partido } from '../../services/organizador.service';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

@Component({
  selector: 'app-equipo-detalle',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ToastComponent,
    ImagePlaceholderComponent
  ],
  templateUrl: './equipo-detalle.component.html',
  styleUrls: ['./equipo-detalle.component.scss']
})
export class EquipoDetalleComponent implements OnInit {
  // Estados
  loading = signal(false);
  equipo = signal<Equipo | null>(null);
  jugadores = signal<Jugador[]>([]);
  partidos = signal<Partido[]>([]);
  
  // Tabs
  activeTab = signal<'info' | 'jugadores' | 'partidos'>('info');
  
  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');
  
  idEquipo = 0;

  // Computeds
  partidosJugados = computed(() => {
    const partidosArray = Array.isArray(this.partidos()) ? this.partidos() : [];
    return partidosArray.filter(p => p.estado === 'finalizado');
  });

  partidosPendientes = computed(() => {
    const partidosArray = Array.isArray(this.partidos()) ? this.partidos() : [];
    return partidosArray.filter(p => p.estado === 'programado' || p.estado === 'en_juego');
  });

  estadisticas = computed(() => {
    const jugados = this.partidosJugados();
    let ganados = 0;
    let empatados = 0;
    let perdidos = 0;
    let golesFavor = 0;
    let golesContra = 0;

    jugados.forEach(partido => {
      const esLocal = partido.id_equipo_local === this.idEquipo;
      const golesEquipo = esLocal ? partido.goles_local : partido.goles_visitante;
      const golesRival = esLocal ? partido.goles_visitante : partido.goles_local;

      golesFavor += golesEquipo;
      golesContra += golesRival;

      if (golesEquipo > golesRival) ganados++;
      else if (golesEquipo === golesRival) empatados++;
      else perdidos++;
    });

    return {
      partidosJugados: jugados.length,
      ganados,
      empatados,
      perdidos,
      golesFavor,
      golesContra,
      diferencia: golesFavor - golesContra
    };
  });

  constructor(
    private organizadorService: OrganizadorService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.idEquipo = +params['id'];
        this.cargarEquipo();
        this.cargarJugadores();
        this.cargarPartidos();
      }
    });
  }

  cargarEquipo(): void {
    this.loading.set(true);
    
    this.organizadorService.obtenerEquipoPorId(this.idEquipo).subscribe({
      next: (response: any) => {
        this.equipo.set(response.equipo || response);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar equipo:', error);
        this.mostrarToast('error', 'Error', 'No se pudo cargar el equipo');
        this.loading.set(false);
      }
    });
  }

  cargarJugadores(): void {
    this.organizadorService.obtenerJugadoresPorEquipo(this.idEquipo).subscribe({
      next: (response) => {
        this.jugadores.set(response.jugadores || []);
      },
      error: (error) => {
        console.error('Error al cargar jugadores:', error);
      }
    });
  }

  cargarPartidos(): void {
    this.organizadorService.obtenerPartidos({ id_equipo: this.idEquipo }).subscribe({
      next: (response) => {
        const partidosData = response.partidos || response;
        this.partidos.set(Array.isArray(partidosData) ? partidosData : []);
      },
      error: (error) => {
        console.error('Error al cargar partidos:', error);
        this.partidos.set([]);
      }
    });
  }

  setActiveTab(tab: 'info' | 'jugadores' | 'partidos'): void {
    this.activeTab.set(tab);
  }

  aprobarEquipo(): void {
    const equipo = this.equipo();
    if (!equipo) return;

    if (confirm(`¿Aprobar el equipo ${equipo.nombre}?`)) {
      this.organizadorService.cambiarEstadoEquipo(equipo.id_equipo, 'aprobado').subscribe({
        next: () => {
          this.mostrarToast('success', 'Equipo aprobado', 'El equipo ha sido aprobado exitosamente');
          this.cargarEquipo();
        },
        error: (error) => {
          console.error('Error al aprobar:', error);
          this.mostrarToast('error', 'Error', 'No se pudo aprobar el equipo');
        }
      });
    }
  }

  rechazarEquipo(): void {
    const equipo = this.equipo();
    if (!equipo) return;

    const motivo = prompt(`¿Por qué rechazas el equipo ${equipo.nombre}?`);
    if (motivo) {
      this.organizadorService.cambiarEstadoEquipo(equipo.id_equipo, 'rechazado', motivo).subscribe({
        next: () => {
          this.mostrarToast('success', 'Equipo rechazado', 'El equipo ha sido rechazado');
          this.cargarEquipo();
        },
        error: (error) => {
          console.error('Error al rechazar:', error);
          this.mostrarToast('error', 'Error', 'No se pudo rechazar el equipo');
        }
      });
    }
  }

  verPartido(idPartido: number): void {
    this.router.navigate(['/organizador/partidos', idPartido]);
  }

  volver(): void {
    this.router.navigate(['/organizador/equipos']);
  }

  mostrarToast(tipo: 'success' | 'error' | 'warning' | 'info', titulo: string, mensaje: string): void {
    this.toastType.set(tipo);
    this.toastTitle.set(titulo);
    this.toastMessage.set(mensaje);
    this.showToast.set(true);
    
    setTimeout(() => {
      this.showToast.set(false);
    }, 5000);
  }

  cerrarToast(): void {
    this.showToast.set(false);
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'aprobado': 'bg-green-100 text-green-700 border-green-300',
      'rechazado': 'bg-red-100 text-red-700 border-red-300'
    };
    return classes[estado] || 'bg-gray-100 text-gray-700 border-gray-300';
  }

  getEstadoPartidoBadge(estado: string): string {
    const classes: { [key: string]: string } = {
      'programado': 'bg-blue-100 text-blue-700',
      'en_juego': 'bg-orange-100 text-orange-700',
      'finalizado': 'bg-green-100 text-green-700',
      'cancelado': 'bg-red-100 text-red-700'
    };
    return classes[estado] || 'bg-gray-100 text-gray-700';
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  formatearFechaOpcional(fecha?: string): string {
    if (!fecha) return 'No disponible';
    return this.formatearFecha(fecha);
  }

  formatearFechaPartido(fecha: string): string {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-EC', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getPosicionIcon(posicion: string): string {
    const icons: { [key: string]: string } = {
      'portero': 'sports_soccer',
      'defensa': 'shield',
      'mediocampista': 'swap_horiz',
      'delantero': 'sports_score'
    };
    return icons[posicion] || 'person';
  }

  getPosicionColor(posicion: string): string {
    const colors: { [key: string]: string } = {
      'portero': 'bg-yellow-100 text-yellow-700',
      'defensa': 'bg-blue-100 text-blue-700',
      'mediocampista': 'bg-green-100 text-green-700',
      'delantero': 'bg-red-100 text-red-700'
    };
    return colors[posicion] || 'bg-gray-100 text-gray-700';
  }

  getResultadoPartido(partido: Partido): { texto: string; clase: string } {
    const esLocal = partido.id_equipo_local === this.idEquipo;
    const golesEquipo = esLocal ? partido.goles_local : partido.goles_visitante;
    const golesRival = esLocal ? partido.goles_visitante : partido.goles_local;

    if (partido.estado !== 'finalizado') {
      return { texto: 'VS', clase: 'text-gray-500' };
    }

    if (golesEquipo > golesRival) {
      return { texto: 'V', clase: 'text-green-600 font-bold' };
    } else if (golesEquipo === golesRival) {
      return { texto: 'E', clase: 'text-yellow-600 font-bold' };
    } else {
      return { texto: 'D', clase: 'text-red-600 font-bold' };
    }
  }
}