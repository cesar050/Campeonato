import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizadorService, Jugador } from '../../../features/organizador/services/organizador.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-validador-jugadores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './validador-jugadores.component.html',
  styleUrls: ['./validador-jugadores.component.scss']
})
export class ValidadorJugadoresComponent implements OnInit {
  @Input() idEquipo!: number;
  @Input() nombreEquipo = '';
  @Output() close = new EventEmitter<void>();
  @Output() validacionCompleta = new EventEmitter<void>();

  jugadores = signal<Jugador[]>([]);
  jugadorActualIndex = signal(0);
  loading = signal(false);
  
  // Modal de rechazo
  showModalRechazo = signal(false);
  motivoRechazo = signal('');
  
  // Toast
  showToast = signal(false);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');

  constructor(
    private organizadorService: OrganizadorService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.cargarJugadores();
  }

  cargarJugadores(): void {
    this.loading.set(true);
    this.organizadorService.obtenerJugadoresConDocumentos(this.idEquipo).subscribe({
      next: (response) => {
        this.jugadores.set(response.jugadores || []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar jugadores:', error);
        this.mostrarToast('Error al cargar jugadores', 'error');
        this.loading.set(false);
      }
    });
  }

  get jugadorActual(): Jugador | null {
    const jugadores = this.jugadores();
    const index = this.jugadorActualIndex();
    return jugadores[index] || null;
  }

  get pdfUrl(): SafeResourceUrl | null {
    const jugador = this.jugadorActual;
    if (!jugador?.documento_pdf_url) return null;
    
    // Sanitizar la URL para el iframe
    return this.sanitizer.bypassSecurityTrustResourceUrl(jugador.documento_pdf_url);
  }

  anteriorJugador(): void {
    const index = this.jugadorActualIndex();
    if (index > 0) {
      this.jugadorActualIndex.set(index - 1);
    }
  }

  siguienteJugador(): void {
    const index = this.jugadorActualIndex();
    const total = this.jugadores().length;
    if (index < total - 1) {
      this.jugadorActualIndex.set(index + 1);
    }
  }

  irAJugador(index: number): void {
    this.jugadorActualIndex.set(index);
  }

  aprobarJugador(): void {
    const jugador = this.jugadorActual;
    if (!jugador) return;

    this.organizadorService.validarJugador(jugador.id_jugador, 'aprobado').subscribe({
      next: () => {
        this.mostrarToast(`${jugador.nombre} ${jugador.apellido} aprobado`, 'success');
        this.actualizarEstadoJugador(jugador.id_jugador, 'aprobado');
        
        // Pasar al siguiente jugador automáticamente
        setTimeout(() => {
          if (this.jugadorActualIndex() < this.jugadores().length - 1) {
            this.siguienteJugador();
          } else {
            // Si era el último, verificar si todos están validados
            this.verificarValidacionCompleta();
          }
        }, 1000);
      },
      error: (error) => {
        console.error('Error al aprobar jugador:', error);
        this.mostrarToast('Error al aprobar jugador', 'error');
      }
    });
  }

  abrirModalRechazo(): void {
    this.motivoRechazo.set('');
    this.showModalRechazo.set(true);
  }

  cerrarModalRechazo(): void {
    this.showModalRechazo.set(false);
    this.motivoRechazo.set('');
  }

  confirmarRechazo(): void {
    const jugador = this.jugadorActual;
    if (!jugador) return;

    if (!this.motivoRechazo().trim()) {
      this.mostrarToast('Debes indicar el motivo del rechazo', 'error');
      return;
    }

    this.organizadorService.validarJugador(
      jugador.id_jugador, 
      'rechazado', 
      this.motivoRechazo()
    ).subscribe({
      next: () => {
        this.mostrarToast(`${jugador.nombre} ${jugador.apellido} rechazado`, 'success');
        this.actualizarEstadoJugador(jugador.id_jugador, 'rechazado', this.motivoRechazo());
        this.cerrarModalRechazo();
        
        // Pasar al siguiente jugador
        setTimeout(() => {
          if (this.jugadorActualIndex() < this.jugadores().length - 1) {
            this.siguienteJugador();
          } else {
            this.verificarValidacionCompleta();
          }
        }, 1000);
      },
      error: (error) => {
        console.error('Error al rechazar jugador:', error);
        this.mostrarToast('Error al rechazar jugador', 'error');
      }
    });
  }

  actualizarEstadoJugador(idJugador: number, estado: string, observaciones?: string): void {
    const jugadores = this.jugadores();
    const index = jugadores.findIndex(j => j.id_jugador === idJugador);
    if (index !== -1) {
      jugadores[index] = {
        ...jugadores[index],
        estado_validacion: estado as any,
        observaciones_validacion: observaciones,
        fecha_validacion: new Date().toISOString()
      };
      this.jugadores.set([...jugadores]);
    }
  }

  verificarValidacionCompleta(): void {
    const jugadores = this.jugadores();
    const pendientes = jugadores.filter(j => 
      !j.estado_validacion || j.estado_validacion === 'pendiente'
    );

    if (pendientes.length === 0) {
      this.mostrarToast('¡Todos los jugadores han sido validados!', 'success');
      setTimeout(() => {
        this.validacionCompleta.emit();
      }, 2000);
    }
  }

  cerrar(): void {
    this.close.emit();
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'error'): void {
    this.toastMessage.set(mensaje);
    this.toastType.set(tipo);
    this.showToast.set(true);
    
    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
  }

  getEstadoBadgeClass(estado?: string): string {
    const classes: { [key: string]: string } = {
      'pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'aprobado': 'bg-green-100 text-green-700 border-green-300',
      'rechazado': 'bg-red-100 text-red-700 border-red-300'
    };
    return classes[estado || 'pendiente'] || classes['pendiente'];
  }

  getProgreso(): number {
    const jugadores = this.jugadores();
    if (jugadores.length === 0) return 0;
    
    const validados = jugadores.filter(j => 
      j.estado_validacion === 'aprobado' || j.estado_validacion === 'rechazado'
    ).length;
    
    return Math.round((validados / jugadores.length) * 100);
  }
}