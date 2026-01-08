import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizadorService, Inscripcion, Equipo, Jugador } from '../../services/organizador.service';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-revisar-solicitud',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ToastComponent,
    ImagePlaceholderComponent,
    PaginationComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './revisar-solicitud.component.html',
  styleUrls: ['./revisar-solicitud.component.scss']
})
export class RevisarSolicitudComponent implements OnInit {
  // Estados
  loading = signal(false);
  inscripcion = signal<Inscripcion | null>(null);
  equipo = signal<Equipo | null>(null);
  jugadores = signal<Jugador[]>([]);

  // Paginación de jugadores
  paginaActual = signal(1);
  jugadoresPorPagina = signal(5);
  
  // Confirm dialog
  showConfirmDialog = signal(false);
  confirmDialogTitle = signal('');
  confirmDialogMessage = signal('');
  confirmDialogType = signal<'info' | 'warning' | 'danger'>('warning');
  confirmAction = signal<(() => void) | null>(null);

  // Modal de PDF
  showPdfModal = signal(false);
  pdfUrl = signal<SafeResourceUrl | null>(null);
  jugadorActual = signal<Jugador | null>(null);

  // Validación
  pdfsRevisados = signal(false);

  // Aprobar/Rechazar
  mensaje = signal('');
  procesando = signal(false);

  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');

  idCampeonato = 0;
  idInscripcion = 0;

  // Computeds
  totalPaginas = computed(() => 
    Math.ceil(this.jugadores().length / this.jugadoresPorPagina())
  );

  totalJugadores = computed(() => this.jugadores().length);

  jugadoresPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.jugadoresPorPagina();
    const fin = inicio + this.jugadoresPorPagina();
    return this.jugadores().slice(inicio, fin);
  });

  jugadoresRequeridos = computed(() => {
    const equipo = this.equipo();
    if (!equipo) return 0;
    return equipo.tipo_deporte === 'indoor' ? 12 : 22;
  });

  cumpleRequisitos = computed(() => {
    return this.jugadores().length >= this.jugadoresRequeridos();
  });

  constructor(
    private organizadorService: OrganizadorService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['idCampeonato'] && params['idInscripcion']) {
        this.idCampeonato = +params['idCampeonato'];
        this.idInscripcion = +params['idInscripcion'];
        this.cargarDatos();
      }
    });
  }

  cargarDatos(): void {
    this.loading.set(true);

    // Cargar inscripción
    this.organizadorService.obtenerInscripcionesPorCampeonato(this.idCampeonato).subscribe({
      next: (response) => {
        const inscripciones = response.inscripciones || [];
        const inscripcion = inscripciones.find((i: any) => i.id === this.idInscripcion);
        
        if (inscripcion) {
          this.inscripcion.set(inscripcion);
          this.cargarEquipo(inscripcion.id_equipo);
        } else {
          this.mostrarToast('error', 'Error', 'Inscripción no encontrada');
          this.volver();
        }
      },
      error: (error) => {
        console.error('Error al cargar inscripción:', error);
        this.mostrarToast('error', 'Error', 'No se pudo cargar la inscripción');
        this.volver();
      }
    });
  }

  cargarEquipo(idEquipo: number): void {
    this.organizadorService.obtenerEquipoPorId(idEquipo).subscribe({
      next: (response: any) => {
        console.log('📦 Equipo recibido:', response);
        const equipoData = response.equipo || response;
        
        console.log('👤 Líder del equipo:', equipoData.lider);
        console.log('📧 Email líder:', equipoData.email_lider);
        console.log('👥 Total jugadores:', equipoData.total_jugadores);
        
        this.equipo.set(equipoData);
        this.cargarJugadores(idEquipo);
      },
      error: (error) => {
        console.error('❌ Error al cargar equipo:', error);
        this.loading.set(false);
      }
    });
  }

  cargarJugadores(idEquipo: number): void {
    this.organizadorService.obtenerJugadoresPorEquipo(idEquipo).subscribe({
      next: (response) => {
        console.log('⚽ Jugadores recibidos:', response);
        const jugadoresData = response.jugadores || response || [];
        console.log('📊 Total de jugadores cargados:', jugadoresData.length);
        
        this.jugadores.set(jugadoresData);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error al cargar jugadores:', error);
        this.jugadores.set([]);
        this.loading.set(false);
      }
    });
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.paginaActual.set(pagina);
  }

  cambiarItemsPorPagina(items: number): void {
    this.jugadoresPorPagina.set(items);
    this.paginaActual.set(1);
  }

  mostrarConfirmacion(title: string, message: string, type: 'info' | 'warning' | 'danger', action: () => void): void {
    this.confirmDialogTitle.set(title);
    this.confirmDialogMessage.set(message);
    this.confirmDialogType.set(type);
    this.confirmAction.set(action);
    this.showConfirmDialog.set(true);
  }

  onConfirmDialog(): void {
    const action = this.confirmAction();
    if (action) {
      action();
    }
    this.showConfirmDialog.set(false);
    this.confirmAction.set(null);
  }

  onCancelDialog(): void {
    this.showConfirmDialog.set(false);
    this.confirmAction.set(null);
  }

  verPDF(jugador: Jugador): void {
    if (!jugador.documento_url) {
      this.mostrarToast('warning', 'Sin documento', 'Este jugador no tiene PDF cargado');
      return;
    }

    this.jugadorActual.set(jugador);
    const url = this.sanitizer.bypassSecurityTrustResourceUrl(jugador.documento_url);
    this.pdfUrl.set(url);
    this.showPdfModal.set(true);
  }

  cerrarPdfModal(): void {
    this.showPdfModal.set(false);
    this.pdfUrl.set(null);
    this.jugadorActual.set(null);
  }

  aprobarSolicitud(): void {
    if (!this.pdfsRevisados()) {
      this.mostrarToast('warning', 'Validación pendiente', 'Debes confirmar que has revisado los documentos');
      return;
    }

    if (!this.cumpleRequisitos()) {
      this.mostrarToast('error', 'Requisitos no cumplidos', 
        `El equipo necesita ${this.jugadoresRequeridos()} jugadores, tiene ${this.jugadores().length}`);
      return;
    }

    if (!this.mensaje().trim()) {
      this.mostrarToast('warning', 'Mensaje requerido', 'Debes escribir un mensaje de aprobación');
      return;
    }

    this.mostrarConfirmacion(
      'Aprobar solicitud',
      '¿Estás seguro de aprobar esta solicitud de inscripción?',
      'warning',
      () => {
        this.aprobarSolicitudConfirmado();
      }
    );
  }

  aprobarSolicitudConfirmado(): void {

    this.procesando.set(true);

    this.organizadorService.cambiarEstadoInscripcion(
      this.idInscripcion,
      'aprobado',
      this.mensaje()
    ).subscribe({
      next: () => {
        this.mostrarToast('success', 'Solicitud aprobada', 'El equipo ha sido aprobado exitosamente');
        setTimeout(() => {
          this.router.navigate(['/organizador/ver-solicitudes', this.idCampeonato]);
        }, 2000);
      },
      error: (error) => {
        console.error('Error al aprobar:', error);
        this.mostrarToast('error', 'Error', 'No se pudo aprobar la solicitud');
        this.procesando.set(false);
      }
    });
  }

  rechazarSolicitud(): void {
    if (!this.mensaje().trim()) {
      this.mostrarToast('warning', 'Motivo requerido', 'Debes indicar el motivo del rechazo');
      return;
    }

    this.mostrarConfirmacion(
      'Rechazar solicitud',
      '¿Estás seguro de rechazar esta solicitud de inscripción? Esta acción requerirá un motivo.',
      'danger',
      () => {
        this.rechazarSolicitudConfirmado();
      }
    );
  }

  rechazarSolicitudConfirmado(): void {

    this.procesando.set(true);

    this.organizadorService.cambiarEstadoInscripcion(
      this.idInscripcion,
      'rechazado',
      this.mensaje()
    ).subscribe({
      next: () => {
        this.mostrarToast('success', 'Solicitud rechazada', 'La solicitud ha sido rechazada');
        setTimeout(() => {
          this.router.navigate(['/organizador/ver-solicitudes', this.idCampeonato]);
        }, 2000);
      },
      error: (error) => {
        console.error('Error al rechazar:', error);
        this.mostrarToast('error', 'Error', 'No se pudo rechazar la solicitud');
        this.procesando.set(false);
      }
    });
  }

  volver(): void {
    this.router.navigate(['/organizador/ver-solicitudes', this.idCampeonato]);
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

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  getPosicionColor(posicion: string): string {
    const colors: { [key: string]: string } = {
      'portero': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      'defensa': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'mediocampista': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'delantero': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[posicion] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }

  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }
}