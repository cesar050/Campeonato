import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizadorService, Campeonato } from '../../services/organizador.service';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

interface EquipoTabla {
  id_equipo: number;
  nombre: string;
  logo_url?: string | null;
  posicion: number;
  partidos_jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
  puntos: number;
}

interface HistorialEquipo {
  victorias: any[];
  empates: any[];
  derrotas: any[];
}

interface Goleador {
  posicion: number;
  jugador: string;
  equipo: string;
  id_equipo?: number;
  logo_url?: string | null;
  goles: number;
  partidos_jugados: number;
  promedio_goles: number;
}

interface Asistidor {
  posicion: number;
  jugador: string;
  equipo: string;
  id_equipo?: number;
  logo_url?: string | null;
  asistencias: number;
  partidos_jugados: number;
  promedio_asistencias: number;
}

@Component({
  selector: 'app-tabla-posiciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastComponent,
    ImagePlaceholderComponent
  ],
  templateUrl: './tabla-posiciones.component.html',
  styleUrls: ['./tabla-posiciones.component.scss']
})
export class TablaPosicionesComponent implements OnInit {
  // Estados
  loading = signal(false);
  tablaPosiciones = signal<EquipoTabla[]>([]);
  misCampeonatos = signal<Campeonato[]>([]);
  equiposInscritos = signal<any[]>([]);
  
  // Filtros
  campeonatoSeleccionado = signal<number | null>(null);
  jornadaSeleccionada = signal<number | null>(null);
  jornadaMaxima = signal(0);
  busquedaEquipo = signal('');
  
  // Vista actual (flip entre 3 tablas)
  vistaTabla = signal<'posiciones' | 'goleadores' | 'asistencias'>('posiciones');
  isFlipping = signal(false);
  
  // Goleadores y Asistencias
  goleadores = signal<Goleador[]>([]);
  asistidores = signal<Asistidor[]>([]);
  loadingGoleadores = signal(false);
  loadingAsistencias = signal(false);
  
  // Modal de historial
  showModalHistorial = signal(false);
  equipoSeleccionado = signal<EquipoTabla | null>(null);
  historialEquipo = signal<HistorialEquipo | null>(null);
  loadingHistorial = signal(false);
  
  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');

  // Computeds
  equiposFiltrados = computed(() => {
    const busqueda = this.busquedaEquipo().toLowerCase();
    if (!busqueda) return this.tablaPosiciones();
    
    return this.tablaPosiciones().filter(equipo => 
      equipo.nombre.toLowerCase().includes(busqueda)
    );
  });

  jornadasDisponibles = computed(() => {
    const max = this.jornadaMaxima();
    return Array.from({ length: max }, (_, i) => i + 1);
  });

  trackByEquipoId(index: number, equipo: EquipoTabla): number {
    return equipo.id_equipo;
  }

  onCampeonatoChange(): void {
    this.jornadaSeleccionada.set(null);
    this.cargarTodasLasTablas();
  }

  limpiarBusqueda(): void {
    this.busquedaEquipo.set('');
  }

  constructor(private organizadorService: OrganizadorService) {}

  ngOnInit(): void {
    this.cargarMisCampeonatos();
  }

  cargarMisCampeonatos(): void {
    this.organizadorService.obtenerMisCampeonatos().subscribe({
      next: (campeonatos) => {
        this.misCampeonatos.set(campeonatos);
        if (campeonatos.length > 0) {
          this.campeonatoSeleccionado.set(campeonatos[0].id_campeonato);
          this.cargarTodasLasTablas();
        }
      },
      error: (error) => {
        console.error('Error al cargar campeonatos:', error);
        this.mostrarToast('error', 'Error', 'No se pudieron cargar los campeonatos');
      }
    });
  }

  cargarTodasLasTablas(): void {
    this.cargarTablaPosiciones();
    this.cargarGoleadores();
    this.cargarAsistencias();
  }

  cargarTablaPosiciones(): void {
    const campeonatoId = this.campeonatoSeleccionado();
    if (!campeonatoId) return;
    
    this.loading.set(true);
    const hastaJornada = this.jornadaSeleccionada();
    
    // Cargar equipos inscritos primero para obtener logos
    this.organizadorService.obtenerEquiposPorCampeonato(campeonatoId, 'aprobado').subscribe({
      next: (response: any) => {
        const equipos = response.equipos || response || [];
        this.equiposInscritos.set(Array.isArray(equipos) ? equipos : []);
        
        // Luego cargar tabla de posiciones
        this.organizadorService.obtenerTablaPosiciones(
          campeonatoId,
          hastaJornada ?? undefined
        ).subscribe({
          next: (response: any) => {
            const tabla = (response.tabla || []).map((equipo: EquipoTabla) => {
              // Si no tiene logo_url, buscarlo en equipos inscritos
              if (!equipo.logo_url) {
                const equipoEncontrado = this.equiposInscritos().find(e => e.id_equipo === equipo.id_equipo);
                if (equipoEncontrado?.logo_url) {
                  equipo.logo_url = equipoEncontrado.logo_url;
                }
              }
              return equipo;
            });
            this.tablaPosiciones.set(tabla);
            this.jornadaMaxima.set(response.jornada_maxima || 0);
            this.loading.set(false);
          },
          error: (error: any) => {
            console.error('Error al cargar tabla:', error);
            this.mostrarToast('error', 'Error', 'No se pudo cargar la tabla de posiciones');
            this.loading.set(false);
          }
        });
      },
      error: (error: any) => {
        console.error('Error al cargar equipos:', error);
        // Continuar aunque falle cargar equipos
        this.organizadorService.obtenerTablaPosiciones(
          campeonatoId,
          hastaJornada ?? undefined
        ).subscribe({
          next: (response: any) => {
            this.tablaPosiciones.set(response.tabla || []);
            this.jornadaMaxima.set(response.jornada_maxima || 0);
            this.loading.set(false);
          },
          error: (error: any) => {
            console.error('Error al cargar tabla:', error);
            this.mostrarToast('error', 'Error', 'No se pudo cargar la tabla de posiciones');
            this.loading.set(false);
          }
        });
      }
    });
  }

  obtenerLogoEquipo(idEquipo: number): string | null {
    // Primero buscar en la tabla
    const equipoEnTabla = this.tablaPosiciones().find(e => e.id_equipo === idEquipo);
    if (equipoEnTabla?.logo_url) {
      return equipoEnTabla.logo_url;
    }
    // Si no, buscar en equipos inscritos
    const equipoInscrito = this.equiposInscritos().find(e => e.id_equipo === idEquipo);
    return equipoInscrito?.logo_url || null;
  }

  cargarGoleadores(): void {
    const campeonatoId = this.campeonatoSeleccionado();
    if (!campeonatoId) return;
    
    this.loadingGoleadores.set(true);
    
    this.organizadorService.obtenerGoleadores(campeonatoId, 20).subscribe({
      next: (response: any) => {
        this.goleadores.set(response.goleadores || []);
        this.loadingGoleadores.set(false);
      },
      error: (error: any) => {
        console.error('Error al cargar goleadores:', error);
        this.mostrarToast('error', 'Error', 'No se pudieron cargar los goleadores');
        this.loadingGoleadores.set(false);
      }
    });
  }

  cargarAsistencias(): void {
    const campeonatoId = this.campeonatoSeleccionado();
    if (!campeonatoId) return;
    
    this.loadingAsistencias.set(true);
    
    this.organizadorService.obtenerAsistencias(campeonatoId, 20).subscribe({
      next: (response: any) => {
        this.asistidores.set(response.asistidores || []);
        this.loadingAsistencias.set(false);
      },
      error: (error: any) => {
        console.error('Error al cargar asistencias:', error);
        this.mostrarToast('error', 'Error', 'No se pudieron cargar las asistencias');
        this.loadingAsistencias.set(false);
      }
    });
  }

  cambiarCampeonato(): void {
    this.jornadaSeleccionada.set(null);
    this.cargarTodasLasTablas();
  }

  cambiarJornada(): void {
    this.cargarTablaPosiciones();
  }

  verTodasLasJornadas(): void {
    this.jornadaSeleccionada.set(null);
    this.cargarTablaPosiciones();
  }

  // ==================== FLIP ENTRE TABLAS ====================
  rotarTabla(): void {
    if (this.isFlipping()) return;
    
    this.isFlipping.set(true);
    
    const vistas: Array<'posiciones' | 'goleadores' | 'asistencias'> = ['posiciones', 'goleadores', 'asistencias'];
    const currentIndex = vistas.indexOf(this.vistaTabla());
    const nextIndex = (currentIndex + 1) % vistas.length;
    
    setTimeout(() => {
      this.vistaTabla.set(vistas[nextIndex]);
      this.isFlipping.set(false);
    }, 300);
  }

  cambiarVistaTabla(vista: 'posiciones' | 'goleadores' | 'asistencias'): void {
    if (this.isFlipping() || this.vistaTabla() === vista) return;
    
    this.isFlipping.set(true);
    
    setTimeout(() => {
      this.vistaTabla.set(vista);
      this.isFlipping.set(false);
    }, 300);
  }

  verHistorialEquipo(equipo: EquipoTabla): void {
    const campeonatoId = this.campeonatoSeleccionado();
    if (!campeonatoId) return;
    
    this.equipoSeleccionado.set(equipo);
    this.showModalHistorial.set(true);
    this.loadingHistorial.set(true);
    
    this.organizadorService.obtenerHistorialEquipoEnCampeonato(campeonatoId, equipo.id_equipo).subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta historial:', response);
        
        if (response.historial) {
          this.historialEquipo.set(response.historial);
        } else {
          this.historialEquipo.set({ victorias: [], empates: [], derrotas: [] });
        }
        
        this.loadingHistorial.set(false);
      },
      error: (error: any) => {
        console.error('❌ Error al cargar historial:', error);
        this.mostrarToast('error', 'Error', 'No se pudo cargar el historial del equipo');
        this.loadingHistorial.set(false);
        this.cerrarModalHistorial();
      }
    });
  }

  cerrarModalHistorial(): void {
    this.showModalHistorial.set(false);
    this.equipoSeleccionado.set(null);
    this.historialEquipo.set(null);
  }

  exportarPDF(): void {
    this.mostrarToast('info', 'Próximamente', 'La exportación a PDF estará disponible pronto');
  }

  exportarExcel(): void {
    this.mostrarToast('info', 'Próximamente', 'La exportación a Excel estará disponible pronto');
  }

  // Utilidades
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

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  getJornadas(): number[] {
    const max = this.jornadaMaxima();
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  // Obtener nombre de vista actual
  getNombreVistaActual(): string {
    const nombres = {
      'posiciones': 'Tabla de Posiciones',
      'goleadores': 'Tabla de Goleadores',
      'asistencias': 'Tabla de Asistencias'
    };
    return nombres[this.vistaTabla()];
  }

  // Obtener icono de vista actual
  getIconoVistaActual(): string {
    const iconos = {
      'posiciones': 'emoji_events',
      'goleadores': 'sports_soccer',
      'asistencias': 'sports_handball'
    };
    return iconos[this.vistaTabla()];
  }

  // ✅ NUEVOS MÉTODOS PARA DISEÑO ESTILO FIXTURE
  getBordeClase(posicion: number, total: number): string {
    if (posicion === 1) return 'border-l-yellow-400';
    if (posicion <= 4) return 'border-l-green-500';
    if (posicion >= total - 2) return 'border-l-red-500';
    return 'border-l-gray-300';
  }

  getBadgeLabel(posicion: number, total: number): string {
    if (posicion === 1) return 'CAMPEÓN';
    if (posicion <= 4) return 'CLASIFICADO';
    if (posicion >= total - 2) return 'DESCENSO';
    return `POS ${posicion}`;
  }

  getBadgeIcon(posicion: number, total: number): string {
    if (posicion === 1) return 'emoji_events';
    if (posicion <= 4) return 'workspace_premium';
    if (posicion >= total - 2) return 'trending_down';
    return 'tag';
  }
}