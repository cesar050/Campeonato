import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LiderEquipoService } from '../../services/lider-equipo.service';
import { Equipo, Partido, Notificacion } from '../../models/lider-equipo.models';

@Component({
  selector: 'app-dashboard-lider',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Estados
  loading = signal(true);
  
  // Datos
  misEquipos = signal<Equipo[]>([]);
  equipoSeleccionado = signal<number | null>(null);
  proximosPartidos = signal<Partido[]>([]);
  notificaciones = signal<Notificacion[]>([]);

  // Equipo actual (computed)
  equipoActual = computed(() => {
    const id = this.equipoSeleccionado();
    if (!id) return null;
    return this.misEquipos().find(e => e.id_equipo === id) || null;
  });

  // Estadísticas
  stats = signal({
    totalJugadores: 0,
    proximoPartido: null as Partido | null,
    notificacionesPendientes: 0,
    partidosJugados: 0,
    campeonatosActivos: 0
  });

  constructor(private liderService: LiderEquipoService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    
    this.liderService.obtenerMisEquipos().subscribe({
      next: (response) => {
        this.misEquipos.set(response.equipos);
        
        if (response.equipos.length > 0) {
          this.equipoSeleccionado.set(response.equipos[0].id_equipo);
          this.cargarDatosEquipo(response.equipos[0].id_equipo);
        } else {
          this.loading.set(false);
        }
      },
      error: (error) => {
        console.error('Error al cargar equipos:', error);
        this.loading.set(false);
      }
    });

    // Cargar notificaciones
    this.cargarNotificaciones();
  }

  cargarNotificaciones(): void {
    this.liderService.obtenerNotificaciones({
      page: 1,
      per_page: 5
    }).subscribe({
      next: (response) => {
        this.notificaciones.set(response.notificaciones?.slice(0, 5) || []);
        this.stats.update(s => ({
          ...s,
          notificacionesPendientes: response.notificaciones?.length || 0
        }));
      },
      error: (error) => console.error('Error al cargar notificaciones:', error)
    });
  }

  cargarDatosEquipo(idEquipo: number): void {
    this.loading.set(true);

    // Cargar próximos partidos
    this.liderService.obtenerPartidos(idEquipo, {
      estado: 'programado',
      per_page: 5
    }).subscribe({
      next: (response) => {
        const ahora = new Date();
        const partidos = response.partidos || [];
        
        const proximos = partidos
          .filter(p => new Date(p.fecha_partido) > ahora)
          .sort((a, b) => new Date(a.fecha_partido).getTime() - new Date(b.fecha_partido).getTime())
          .slice(0, 5);
        
        this.proximosPartidos.set(proximos);

        if (proximos.length > 0) {
          this.stats.update(s => ({ ...s, proximoPartido: proximos[0] }));
        }

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar partidos:', error);
        this.loading.set(false);
      }
    });

    // Actualizar stats del equipo
    const equipo = this.misEquipos().find(e => e.id_equipo === idEquipo);
    if (equipo) {
      this.stats.update(s => ({
        ...s,
        totalJugadores: equipo.total_jugadores || 0,
        campeonatosActivos: equipo.campeonatos?.filter(c => c.estado_inscripcion === 'aprobado').length || 0
      }));
    }
  }

  cambiarEquipo(): void {
    const id = this.equipoSeleccionado();
    if (id) {
      this.cargarDatosEquipo(id);
    }
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calcularDiasRestantes(fecha: string): number {
    const fechaPartido = new Date(fecha);
    const hoy = new Date();
    const diff = fechaPartido.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // ============================================
  // FUNCIONES PARA FORMATEO DE FECHAS EN HTML
  // ============================================
  
  obtenerDia(fecha: string): number {
    return new Date(fecha).getDate();
  }

  obtenerMes(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
  }

  obtenerHora(fecha: string): string {
    return new Date(fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  formatearFechaNotificacion(fecha: string | undefined): string {
    if (!fecha) return 'Sin fecha';
    
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = ahora.getTime() - date.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
  
    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias}d`;
    
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  }

  getEstadoBadge(estado: string): string {
    const badges: any = {
      'pendiente': 'PENDIENTE',
      'aprobado': 'APROBADO',
      'rechazado': 'RECHAZADO'
    };
    return badges[estado] || estado.toUpperCase();
  }

  getTipoNotificacionClase(tipo: string): string {
    const clases: any = {
      'inscripcion': 'tipo-inscripcion',
      'partido': 'tipo-partido',
      'general': 'tipo-general',
      'sistema': 'tipo-sistema'
    };
    return clases[tipo] || 'tipo-general';
  }
}