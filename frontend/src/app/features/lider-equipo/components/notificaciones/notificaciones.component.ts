import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LiderEquipoService } from '../../services/lider-equipo.service';
import { Notificacion } from '../../models/lider-equipo.models';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss']
})
export class NotificacionesComponent implements OnInit {
  loading = signal(true);
  notificaciones = signal<Notificacion[]>([]);
  filtroActivo = signal<'todas' | 'no_leidas'>('todas');
  noLeidas = signal(0);

  constructor(private liderService: LiderEquipoService) {}

  ngOnInit(): void {
    this.cargarNotificaciones();
    this.cargarContadorNoLeidas();
  }

  cargarNotificaciones(): void {
    this.loading.set(true);
    const params = this.filtroActivo() === 'no_leidas' ? { leida: false } : {};

    this.liderService.obtenerNotificaciones(params).subscribe({
      next: (response: any) => {
        this.notificaciones.set(response.notificaciones || []);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error al cargar notificaciones:', error);
        this.loading.set(false);
      }
    });
  }

  cargarContadorNoLeidas(): void {
    this.liderService.contarNoLeidas().subscribe({
      next: (response: any) => {
        this.noLeidas.set(response.no_leidas || 0);
      },
      error: (error: any) => {
        console.error('Error al contar no leídas:', error);
      }
    });
  }

  marcarComoLeida(notificacion: Notificacion): void {
    if (notificacion.leida) return;

    this.liderService.marcarNotificacionLeida(notificacion.id_notificacion).subscribe({
      next: () => {
        notificacion.leida = true;
        this.noLeidas.update(count => Math.max(0, count - 1));
      },
      error: (error: any) => {
        console.error('Error al marcar como leída:', error);
      }
    });
  }

  marcarTodasLeidas(): void {
    this.liderService.marcarTodasLeidas().subscribe({
      next: () => {
        this.notificaciones().forEach(n => n.leida = true);
        this.noLeidas.set(0);
      },
      error: (error: any) => {
        console.error('Error al marcar todas como leídas:', error);
      }
    });
  }

  eliminarNotificacion(notificacion: Notificacion): void {
    if (!confirm('¿Eliminar esta notificación?')) return;

    this.liderService.eliminarNotificacion(notificacion.id_notificacion).subscribe({
      next: () => {
        this.notificaciones.update(list => list.filter(n => n.id_notificacion !== notificacion.id_notificacion));
        if (!notificacion.leida) {
          this.noLeidas.update(count => Math.max(0, count - 1));
        }
      },
      error: (error: any) => {
        console.error('Error al eliminar notificación:', error);
      }
    });
  }

  cambiarFiltro(filtro: 'todas' | 'no_leidas'): void {
    this.filtroActivo.set(filtro);
    this.cargarNotificaciones();
  }

  getIcono(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'solicitud_aprobada': 'check_circle',
      'solicitud_rechazada': 'cancel',
      'alineacion_rival': 'sports_soccer',
      'partido_proximo': 'event',
      'resultado_partido': 'emoji_events'
    };
    return iconos[tipo] || 'notifications';
  }

  getColor(tipo: string): string {
    const colores: { [key: string]: string } = {
      'solicitud_aprobada': 'success',
      'solicitud_rechazada': 'danger',
      'alineacion_rival': 'info',
      'partido_proximo': 'warning',
      'resultado_partido': 'primary'
    };
    return colores[tipo] || 'default';
  }

  formatearFecha(fecha: string | undefined): string {
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

  irADestino(notificacion: Notificacion): void {
    this.marcarComoLeida(notificacion);
    
    // Lógica de navegación según tipo
    if (notificacion.id_partido) {
      // Navegar a alineaciones con ese partido
      console.log('Navegar a partido:', notificacion.id_partido);
    } else if (notificacion.id_campeonato) {
      // Navegar al campeonato
      console.log('Navegar a campeonato:', notificacion.id_campeonato);
    }
  }
}