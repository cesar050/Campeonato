import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizadorService, Equipo, Campeonato } from '../../services/organizador.service';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

@Component({
  selector: 'app-equipos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ToastComponent,
    ImagePlaceholderComponent
  ],
  templateUrl: './equipos.component.html',
  styleUrls: ['./equipos.component.scss']
})
export class EquiposComponent implements OnInit {
  // Exponer Math
  Math = Math;

  // Estados
  loading = signal(false);
  equipos = signal<Equipo[]>([]);
  misCampeonatos = signal<Campeonato[]>([]);

  // Filtros
  campeonatoSeleccionado = signal<number | null>(null);
  filtroEstado = signal<'todos' | 'pendiente' | 'aprobado' | 'rechazado'>('todos');
  busqueda = signal('');
  ordenamiento = signal<'nombre_asc' | 'nombre_desc' | 'fecha_asc' | 'fecha_desc'>('nombre_asc');

  // Paginación
  paginaActual = signal(1);
  itemsPorPagina = 10;

  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');

  // Computeds
  equiposFiltrados = computed(() => {
    let resultado = this.equipos();

    // Filtrar por búsqueda
    if (this.busqueda().trim()) {
      const busquedaLower = this.busqueda().toLowerCase();
      resultado = resultado.filter(e =>
        e.nombre.toLowerCase().includes(busquedaLower) ||
        e.nombre_lider?.toLowerCase().includes(busquedaLower) ||
        e.estadio?.toLowerCase().includes(busquedaLower)
      );
    }

    // Filtrar por estado
    if (this.filtroEstado() !== 'todos') {
      resultado = resultado.filter(e => e.estado === this.filtroEstado());
    }

    // Ordenar
    resultado.sort((a, b) => {
      switch (this.ordenamiento()) {
        case 'nombre_asc':
          return a.nombre.localeCompare(b.nombre);
        case 'nombre_desc':
          return b.nombre.localeCompare(a.nombre);
        case 'fecha_asc':
          return new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime();
        case 'fecha_desc':
          return new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime();
        default:
          return 0;
      }
    });

    return resultado;
  });

  totalPaginas = computed(() =>
    Math.ceil(this.equiposFiltrados().length / this.itemsPorPagina)
  );

  equiposPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.equiposFiltrados().slice(inicio, fin);
  });

  constructor(
    private organizadorService: OrganizadorService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarMisCampeonatos();
    this.cargarEquipos();
  }

  cargarMisCampeonatos(): void {
    this.organizadorService.obtenerMisCampeonatos().subscribe({
      next: (campeonatos) => {
        this.misCampeonatos.set(campeonatos);
      },
      error: (error) => {
        console.error('Error al cargar campeonatos:', error);
      }
    });
  }
  cargarEquipos(): void {
    this.loading.set(true);
  
    // Si hay campeonato seleccionado, obtener solo equipos con inscripción
    if (this.campeonatoSeleccionado()) {
      const estado = this.filtroEstado() !== 'todos' ? this.filtroEstado() : undefined;
      
      this.organizadorService.obtenerEquiposPorCampeonato(
        this.campeonatoSeleccionado()!,
        estado
      ).subscribe({
        next: (response) => {
          this.equipos.set(response.equipos || []);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error al cargar equipos:', error);
          this.mostrarToast('error', 'Error', 'No se pudieron cargar los equipos');
          this.loading.set(false);
        }
      });
    } else {
      // Si no hay campeonato seleccionado, no mostrar nada
      this.equipos.set([]);
      this.loading.set(false);
      this.mostrarToast('info', 'Selecciona un campeonato', 'Debes seleccionar un campeonato para ver sus equipos');
    }
  }

  cambiarCampeonato(): void {
    this.paginaActual.set(1);
    this.cargarEquipos();
  }

  cambiarFiltroEstado(estado: 'todos' | 'pendiente' | 'aprobado' | 'rechazado'): void {
    this.filtroEstado.set(estado);
    this.paginaActual.set(1);
  }

  cambiarOrdenamiento(orden: 'nombre_asc' | 'nombre_desc' | 'fecha_asc' | 'fecha_desc'): void {
    this.ordenamiento.set(orden);
  }

  buscar(): void {
    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.campeonatoSeleccionado.set(null);
    this.filtroEstado.set('todos');
    this.busqueda.set('');
    this.ordenamiento.set('nombre_asc');
    this.paginaActual.set(1);
    this.cargarEquipos();
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.paginaActual.set(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  verDetalle(idEquipo: number): void {
    this.router.navigate(['/organizador/equipos', idEquipo]);
  }

  aprobarEquipo(equipo: Equipo, event: Event): void {
    event.stopPropagation();

    if (confirm(`¿Aprobar el equipo ${equipo.nombre}?`)) {
      this.organizadorService.cambiarEstadoEquipo(equipo.id_equipo, 'aprobado').subscribe({
        next: () => {
          this.mostrarToast('success', 'Equipo aprobado', `${equipo.nombre} ha sido aprobado`);
          this.cargarEquipos();
        },
        error: (error) => {
          console.error('Error al aprobar equipo:', error);
          this.mostrarToast('error', 'Error', 'No se pudo aprobar el equipo');
        }
      });
    }
  }

  rechazarEquipo(equipo: Equipo, event: Event): void {
    event.stopPropagation();

    const motivo = prompt(`¿Por qué rechazas el equipo ${equipo.nombre}?`);
    if (motivo) {
      this.organizadorService.cambiarEstadoEquipo(equipo.id_equipo, 'rechazado', motivo).subscribe({
        next: () => {
          this.mostrarToast('success', 'Equipo rechazado', `${equipo.nombre} ha sido rechazado`);
          this.cargarEquipos();
        },
        error: (error) => {
          console.error('Error al rechazar equipo:', error);
          this.mostrarToast('error', 'Error', 'No se pudo rechazar el equipo');
        }
      });
    }
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

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  getPaginasArray(): number[] {
    return Array.from({ length: this.totalPaginas() }, (_, i) => i + 1);
  }

  // ==================== MÉTODOS PARA STATS ====================

  getEquiposAprobados(): number {
    return this.equipos().filter(e => e.estado === 'aprobado').length;
  }

  getEquiposPendientes(): number {
    return this.equipos().filter(e => e.estado === 'pendiente').length;
  }
}