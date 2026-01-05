import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizadorService, Inscripcion, Equipo } from '../../services/organizador.service';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

@Component({
  selector: 'app-ver-solicitudes',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ToastComponent,
    ImagePlaceholderComponent
  ],
  templateUrl: './ver-solicitudes.component.html',
  styleUrls: ['./ver-solicitudes.component.scss']
})
export class VerSolicitudesComponent implements OnInit {
  // Exponer Math para el template
  Math = Math;

  loading = signal(false);
  inscripciones = signal<(Inscripcion & { equipo?: Equipo })[]>([]);

  // Paginación
  paginaActual = signal(1);
  totalPaginas = signal(1);
  totalInscripciones = signal(0);
  itemsPorPagina = 5;

  // Filtros y búsqueda
  filtroEstado = signal<'todas' | 'pendiente' | 'aprobado' | 'rechazado'>('pendiente');
  ordenamiento = signal<'fecha_asc' | 'fecha_desc'>('fecha_desc');
  busquedaLider = signal('');
  fechaBusqueda = signal('');

  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');

  // Modals
  showRechazarModal = signal(false);
  inscripcionSeleccionada = signal<Inscripcion | null>(null);
  motivoRechazo = signal('');

  idCampeonato = 0;

  constructor(
    private organizadorService: OrganizadorService,
    public router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    console.log('VerSolicitudesComponent inicializado');

    // Obtener idCampeonato de la ruta
    this.route.params.subscribe(params => {
      console.log('Params recibidos:', params);

      if (params['idCampeonato']) {
        this.idCampeonato = +params['idCampeonato'];
        console.log('ID Campeonato:', this.idCampeonato);
        this.cargarInscripciones();
      } else {
        console.error('No se encontró idCampeonato en los params');
        this.mostrarToast('error', 'Error', 'No se especificó el campeonato');
        this.volver();
      }
    });
  }

  cargarInscripciones(): void {
    console.log('Cargando inscripciones para campeonato:', this.idCampeonato);
    this.loading.set(true);

    // Usar el método simple sin paginación por ahora para debug
    this.organizadorService.obtenerInscripcionesPorCampeonato(this.idCampeonato).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);

        let inscripciones = response.inscripciones || response || [];
        console.log('Inscripciones obtenidas:', inscripciones);

        // Filtrar por estado si no es 'todas'
        if (this.filtroEstado() !== 'todas') {
          inscripciones = inscripciones.filter((i: any) =>
            i.estado_inscripcion === this.filtroEstado()
          );
        }

        // Filtrar por líder si hay búsqueda
        if (this.busquedaLider().trim()) {
          inscripciones = inscripciones.filter((i: any) =>
            i.equipo?.nombre_lider?.toLowerCase().includes(this.busquedaLider().toLowerCase())
          );
        }

        // Ordenar
        inscripciones.sort((a: any, b: any) => {
          const fechaA = new Date(a.fecha_inscripcion).getTime();
          const fechaB = new Date(b.fecha_inscripcion).getTime();
          return this.ordenamiento() === 'fecha_desc' ? fechaB - fechaA : fechaA - fechaB;
        });

        // Cargar datos de equipos
        if (inscripciones.length === 0) {
          this.inscripciones.set([]);
          this.totalInscripciones.set(0);
          this.loading.set(false);
          return;
        }

        const inscripcionesConEquipos: (Inscripcion & { equipo?: Equipo })[] = [];
        let completadas = 0;

        inscripciones.forEach((inscripcion: any) => {
          this.organizadorService.obtenerEquipoPorId(inscripcion.id_equipo).subscribe({
            next: (equipoResponse: any) => {
              const equipo = equipoResponse.equipo || equipoResponse;
              inscripcionesConEquipos.push({ ...inscripcion, equipo });
              completadas++;

              if (completadas === inscripciones.length) {
                console.log('Inscripciones con equipos:', inscripcionesConEquipos);
                this.inscripciones.set(inscripcionesConEquipos);
                this.totalInscripciones.set(inscripcionesConEquipos.length);
                this.totalPaginas.set(Math.ceil(inscripcionesConEquipos.length / this.itemsPorPagina));
                this.loading.set(false);
              }
            },
            error: () => {
              inscripcionesConEquipos.push(inscripcion);
              completadas++;

              if (completadas === inscripciones.length) {
                this.inscripciones.set(inscripcionesConEquipos);
                this.totalInscripciones.set(inscripcionesConEquipos.length);
                this.totalPaginas.set(Math.ceil(inscripcionesConEquipos.length / this.itemsPorPagina));
                this.loading.set(false);
              }
            }
          });
        });
      },
      error: (error) => {
        console.error('Error al cargar inscripciones:', error);
        this.mostrarToast('error', 'Error', 'No se pudieron cargar las solicitudes');
        this.loading.set(false);
      }
    });
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.paginaActual.set(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cambiarOrdenamiento(orden: 'fecha_asc' | 'fecha_desc'): void {
    this.ordenamiento.set(orden);
    this.paginaActual.set(1);
    this.cargarInscripciones();
  }

  cambiarFiltroEstado(estado: 'todas' | 'pendiente' | 'aprobado' | 'rechazado'): void {
    this.filtroEstado.set(estado);
    this.paginaActual.set(1);
    this.cargarInscripciones();
  }

  buscarPorLider(): void {
    this.paginaActual.set(1);
    this.cargarInscripciones();
  }

  buscarPorFecha(): void {
    this.paginaActual.set(1);
    this.cargarInscripciones();
  }

  limpiarBusqueda(): void {
    this.busquedaLider.set('');
    this.fechaBusqueda.set('');
    this.paginaActual.set(1);
    this.cargarInscripciones();
  }

  aprobarInscripcion(inscripcion: Inscripcion): void {
    if (confirm(`¿Aprobar la inscripción del equipo ${inscripcion.equipo?.nombre}?`)) {
      this.organizadorService.cambiarEstadoInscripcion(inscripcion.id, 'aprobado').subscribe({
        next: () => {
          this.mostrarToast('success', 'Solicitud aprobada', `El equipo ha sido aprobado exitosamente`);
          this.cargarInscripciones();
        },
        error: (error) => {
          console.error('Error al aprobar:', error);
          this.mostrarToast('error', 'Error al aprobar', 'No se pudo aprobar la solicitud');
        }
      });
    }
  }

  abrirModalRechazo(inscripcion: Inscripcion): void {
    this.inscripcionSeleccionada.set(inscripcion);
    this.motivoRechazo.set('');
    this.showRechazarModal.set(true);
  }

  cerrarModalRechazo(): void {
    this.showRechazarModal.set(false);
    this.inscripcionSeleccionada.set(null);
    this.motivoRechazo.set('');
  }

  confirmarRechazo(): void {
    const inscripcion = this.inscripcionSeleccionada();
    if (!inscripcion) return;

    if (!this.motivoRechazo().trim()) {
      this.mostrarToast('warning', 'Motivo requerido', 'Debes indicar el motivo del rechazo');
      return;
    }

    this.organizadorService.cambiarEstadoInscripcion(
      inscripcion.id,
      'rechazado',
      this.motivoRechazo()
    ).subscribe({
      next: () => {
        this.mostrarToast('success', 'Solicitud rechazada', 'La solicitud ha sido rechazada');
        this.cerrarModalRechazo();
        this.cargarInscripciones();
      },
      error: (error) => {
        console.error('Error al rechazar:', error);
        this.mostrarToast('error', 'Error al rechazar', 'No se pudo rechazar la solicitud');
      }
    });
  }

  verDetalleEquipo(idEquipo: number): void {
    this.router.navigate(['/organizador/equipos', idEquipo]);
  }

  verJugadores(inscripcion: Inscripcion): void {
    // TODO: Abrir modal con lista de jugadores y PDFs
    console.log('Ver jugadores de:', inscripcion.equipo?.nombre);
    this.mostrarToast('info', 'Próximamente', 'Funcionalidad de validación de jugadores en desarrollo');
  }

  volver(): void {
    this.router.navigate(['/organizador/mi-campeonato']);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'aprobado': 'bg-green-100 text-green-700 border-green-300',
      'rechazado': 'bg-red-100 text-red-700 border-red-300'
    };
    return classes[estado] || 'bg-gray-100 text-gray-700 border-gray-300';
  }

  getPaginasArray(): number[] {
    return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1);
  }

  getInscripcionesPaginadas(): (Inscripcion & { equipo?: Equipo })[] {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.inscripciones().slice(inicio, fin);
  }
  // ==================== MÉTODOS PARA EL TEMPLATE ====================

  getSolicitudesPendientes(): number {
    return this.inscripciones().filter(i => i.estado_inscripcion === 'pendiente').length;
  }

  tieneSolicitudesPendientes(): boolean {
    return this.getSolicitudesPendientes() > 0;
  }
}