import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

interface Formacion {
  id: string;
  nombre: string;
  codigo: string;
  tipo: '11' | '6';
  posiciones: Array<{ x: number; y: number; posicion: string }>;
  personalizada: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-formaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmDialogComponent, ToastComponent, PaginationComponent],
  templateUrl: './formaciones.component.html',
  styleUrls: ['./formaciones.component.scss']
})
export class FormacionesComponent implements OnInit {
  formaciones = signal<Formacion[]>([]);
  formacionesFiltradas = signal<Formacion[]>([]);
  filtroTipo = signal<'todas' | '11' | '6'>('todas');
  modoCreacion = signal<boolean>(false);
  formacionEnEdicion = signal<Formacion | null>(null);

  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(6); // Por defecto 6 formaciones por página (menos scroll)

  // Computed: formaciones paginadas
  formacionesPaginadas = computed(() => {
    const filtradas = this.formacionesFiltradas();
    const inicio = (this.currentPage() - 1) * this.itemsPerPage();
    const fin = inicio + this.itemsPerPage();
    return filtradas.slice(inicio, fin);
  });

  // Computed: total de páginas
  totalPages = computed(() => {
    const total = this.formacionesFiltradas().length;
    return Math.ceil(total / this.itemsPerPage());
  });

  // UI: confirm/toast
  showConfirmEliminar = signal(false);
  formacionAEliminar = signal<Formacion | null>(null);
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');

  ngOnInit(): void {
    this.cargarFormaciones();
  }

  cargarFormaciones(): void {
    const formacionesGuardadas = localStorage.getItem('formaciones_personalizadas');
    const personalizadas: Formacion[] = formacionesGuardadas ? JSON.parse(formacionesGuardadas) : [];

    const predefinidas: Formacion[] = [
      {
        id: '4-4-2',
        nombre: '4-4-2 Clásica',
        codigo: '4-4-2',
        tipo: '11',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 95, posicion: 'Portero' },
          { x: 20, y: 75, posicion: 'Defensa' },
          { x: 40, y: 75, posicion: 'Defensa' },
          { x: 60, y: 75, posicion: 'Defensa' },
          { x: 80, y: 75, posicion: 'Defensa' },
          { x: 20, y: 50, posicion: 'Mediocampista' },
          { x: 40, y: 50, posicion: 'Mediocampista' },
          { x: 60, y: 50, posicion: 'Mediocampista' },
          { x: 80, y: 50, posicion: 'Mediocampista' },
          { x: 35, y: 20, posicion: 'Delantero' },
          { x: 65, y: 20, posicion: 'Delantero' }
        ]
      },
      {
        id: '4-3-3',
        nombre: '4-3-3 Ofensiva',
        codigo: '4-3-3',
        tipo: '11',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 95, posicion: 'Portero' },
          { x: 20, y: 75, posicion: 'Defensa' },
          { x: 40, y: 75, posicion: 'Defensa' },
          { x: 60, y: 75, posicion: 'Defensa' },
          { x: 80, y: 75, posicion: 'Defensa' },
          { x: 30, y: 50, posicion: 'Mediocampista' },
          { x: 50, y: 50, posicion: 'Mediocampista' },
          { x: 70, y: 50, posicion: 'Mediocampista' },
          { x: 20, y: 20, posicion: 'Delantero' },
          { x: 50, y: 15, posicion: 'Delantero' },
          { x: 80, y: 20, posicion: 'Delantero' }
        ]
      },
      {
        id: '3-5-2',
        nombre: '3-5-2 Táctica',
        codigo: '3-5-2',
        tipo: '11',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 95, posicion: 'Portero' },
          { x: 30, y: 75, posicion: 'Defensa' },
          { x: 50, y: 75, posicion: 'Defensa' },
          { x: 70, y: 75, posicion: 'Defensa' },
          { x: 15, y: 50, posicion: 'Mediocampista' },
          { x: 35, y: 50, posicion: 'Mediocampista' },
          { x: 50, y: 50, posicion: 'Mediocampista' },
          { x: 65, y: 50, posicion: 'Mediocampista' },
          { x: 85, y: 50, posicion: 'Mediocampista' },
          { x: 35, y: 20, posicion: 'Delantero' },
          { x: 65, y: 20, posicion: 'Delantero' }
        ]
      },
      {
        id: '4-2-3-1',
        nombre: '4-2-3-1 Moderna',
        codigo: '4-2-3-1',
        tipo: '11',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 95, posicion: 'Portero' },
          { x: 20, y: 75, posicion: 'Defensa' },
          { x: 40, y: 75, posicion: 'Defensa' },
          { x: 60, y: 75, posicion: 'Defensa' },
          { x: 80, y: 75, posicion: 'Defensa' },
          { x: 35, y: 60, posicion: 'Mediocampista' },
          { x: 65, y: 60, posicion: 'Mediocampista' },
          { x: 25, y: 35, posicion: 'Mediocampista' },
          { x: 50, y: 35, posicion: 'Mediocampista' },
          { x: 75, y: 35, posicion: 'Mediocampista' },
          { x: 50, y: 15, posicion: 'Delantero' }
        ]
      },
      {
        id: '3-4-3',
        nombre: '3-4-3 Ultra Ofensiva',
        codigo: '3-4-3',
        tipo: '11',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 95, posicion: 'Portero' },
          { x: 30, y: 75, posicion: 'Defensa' },
          { x: 50, y: 75, posicion: 'Defensa' },
          { x: 70, y: 75, posicion: 'Defensa' },
          { x: 20, y: 50, posicion: 'Mediocampista' },
          { x: 40, y: 50, posicion: 'Mediocampista' },
          { x: 60, y: 50, posicion: 'Mediocampista' },
          { x: 80, y: 50, posicion: 'Mediocampista' },
          { x: 25, y: 20, posicion: 'Delantero' },
          { x: 50, y: 15, posicion: 'Delantero' },
          { x: 75, y: 20, posicion: 'Delantero' }
        ]
      },
      {
        id: '1-2-2',
        nombre: '1-2-2 Indoor',
        codigo: '1-2-2',
        tipo: '6',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 90, posicion: 'Portero' },
          { x: 30, y: 65, posicion: 'Defensa' },
          { x: 70, y: 65, posicion: 'Defensa' },
          { x: 30, y: 35, posicion: 'Mediocampista' },
          { x: 70, y: 35, posicion: 'Mediocampista' },
          { x: 50, y: 15, posicion: 'Delantero' }
        ]
      },
      {
        id: '1-1-3',
        nombre: '1-1-3 Indoor Ofensivo',
        codigo: '1-1-3',
        tipo: '6',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 90, posicion: 'Portero' },
          { x: 50, y: 65, posicion: 'Defensa' },
          { x: 25, y: 35, posicion: 'Delantero' },
          { x: 50, y: 30, posicion: 'Delantero' },
          { x: 75, y: 35, posicion: 'Delantero' },
          { x: 50, y: 10, posicion: 'Delantero' }
        ]
      },
      {
        id: '1-3-1',
        nombre: '1-3-1 Indoor Defensivo',
        codigo: '1-3-1',
        tipo: '6',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 90, posicion: 'Portero' },
          { x: 25, y: 65, posicion: 'Defensa' },
          { x: 50, y: 65, posicion: 'Defensa' },
          { x: 75, y: 65, posicion: 'Defensa' },
          { x: 35, y: 30, posicion: 'Mediocampista' },
          { x: 50, y: 15, posicion: 'Delantero' }
        ]
      }
    ];

    const todas = [...predefinidas, ...personalizadas];
    this.formaciones.set(todas);
    this.aplicarFiltro();
  }

  aplicarFiltro(): void {
    const filtro = this.filtroTipo();
    if (filtro === 'todas') {
      this.formacionesFiltradas.set(this.formaciones());
    } else {
      this.formacionesFiltradas.set(
        this.formaciones().filter(f => f.tipo === filtro)
      );
    }
    // Resetear a página 1 cuando cambia el filtro
    this.currentPage.set(1);
  }

  // Métodos de paginación
  onPageChange(page: number): void {
    this.currentPage.set(page);
    // Scroll al inicio del grid
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onItemsPerPageChange(items: number): void {
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
  }

  cambiarFiltro(tipo: 'todas' | '11' | '6'): void {
    this.filtroTipo.set(tipo);
    this.aplicarFiltro();
  }

  crearNuevaFormacion(tipo: '11' | '6'): void {
    const nuevaFormacion: Formacion = {
      id: `custom-${Date.now()}`,
      nombre: '',
      codigo: '',
      tipo,
      personalizada: true,
      createdAt: new Date(),
      posiciones: []
    };
    this.formacionEnEdicion.set(nuevaFormacion);
    this.modoCreacion.set(true);
  }

  onCanchaClick(event: MouseEvent, tipoPosicion: string): void {
    const formacion = this.formacionEnEdicion();
    if (!formacion) return;

    const maxJugadores = formacion.tipo === '11' ? 11 : 6;
    if (formacion.posiciones.length >= maxJugadores) {
      this.mostrarToast('warning', 'Límite alcanzado', `Ya tienes ${maxJugadores} posiciones. No puedes agregar más.`);
      return;
    }

    const cancha = event.currentTarget as HTMLElement;
    const rect = cancha.getBoundingClientRect();
    
    // Calcular posición en porcentaje
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);

    // Validar límites
    if (x < 5 || x > 95 || y < 5 || y > 95) {
      this.mostrarToast('warning', 'Posición inválida', 'Coloca la posición dentro de la cancha.');
      return;
    }

    // Validar que no esté muy cerca de otra posición
    const muyCerca = formacion.posiciones.some(pos => {
      const distancia = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
      return distancia < 8; // 8% de distancia mínima
    });

    if (muyCerca) {
      this.mostrarToast('warning', 'Muy cerca', 'Hay una posición muy cerca. Intenta en otro lugar.');
      return;
    }

    // Agregar posición
    formacion.posiciones.push({ x, y, posicion: tipoPosicion });
    this.formacionEnEdicion.set({ ...formacion });
  }

  eliminarPosicion(index: number): void {
    const formacion = this.formacionEnEdicion();
    if (!formacion) return;

    formacion.posiciones.splice(index, 1);
    this.formacionEnEdicion.set({ ...formacion });
  }

  guardarFormacion(nombre: string): void {
    const formacion = this.formacionEnEdicion();
    if (!formacion) return;

    if (!nombre || nombre.trim() === '') {
      this.mostrarToast('warning', 'Nombre requerido', 'Debes ingresar un nombre para la formación.');
      return;
    }

    const maxPosiciones = formacion.tipo === '11' ? 11 : 6;
    if (formacion.posiciones.length !== maxPosiciones) {
      this.mostrarToast('warning', 'Formación incompleta', `Debes colocar exactamente ${maxPosiciones} posiciones.`);
      return;
    }

    formacion.nombre = nombre.trim();
    formacion.codigo = nombre.toLowerCase().trim().replace(/\s+/g, '-');

    const formaciones = this.formaciones();
    const index = formaciones.findIndex(f => f.id === formacion.id);
    
    if (index >= 0) {
      // Editar existente
      formaciones[index] = formacion;
    } else {
      // Agregar nueva
      formaciones.push(formacion);
    }

    this.formaciones.set([...formaciones]);
    this.guardarEnLocalStorage();
    this.aplicarFiltro();
    this.cancelarEdicion();
    
    this.mostrarToast('success', 'Formación guardada', `La formación "${nombre}" se guardó exitosamente.`);
  }

  editarFormacion(formacion: Formacion): void {
    if (!formacion.personalizada) {
      this.mostrarToast('info', 'No editable', 'No puedes editar formaciones predefinidas. Usa "Duplicar" para crear una copia.');
      return;
    }
    
    // Crear copia para editar
    this.formacionEnEdicion.set({ ...formacion, posiciones: [...formacion.posiciones] });
    this.modoCreacion.set(true);
  }

  duplicarFormacion(formacion: Formacion): void {
    const duplicada: Formacion = {
      ...formacion,
      id: `custom-${Date.now()}`,
      nombre: `${formacion.nombre} (Copia)`,
      codigo: `${formacion.codigo}-copia-${Date.now()}`,
      personalizada: true,
      createdAt: new Date(),
      posiciones: [...formacion.posiciones] // Copiar posiciones
    };
    
    const formaciones = this.formaciones();
    formaciones.push(duplicada);
    this.formaciones.set([...formaciones]);
    this.guardarEnLocalStorage();
    this.aplicarFiltro();
    
    this.mostrarToast('success', 'Formación duplicada', 'La formación se duplicó exitosamente.');
  }

  eliminarFormacion(formacion: Formacion): void {
    if (!formacion.personalizada) {
      this.mostrarToast('info', 'No eliminable', 'No puedes eliminar formaciones predefinidas.');
      return;
    }
    this.formacionAEliminar.set(formacion);
    this.showConfirmEliminar.set(true);
  }

  confirmEliminar(confirmed: boolean): void {
    const formacion = this.formacionAEliminar();
    this.showConfirmEliminar.set(false);
    this.formacionAEliminar.set(null);
    if (!confirmed || !formacion) return;

    const formaciones = this.formaciones().filter(f => f.id !== formacion.id);
    this.formaciones.set(formaciones);
    this.guardarEnLocalStorage();
    this.aplicarFiltro();

    this.mostrarToast('success', 'Formación eliminada', 'La formación se eliminó exitosamente.');
  }

  cancelarEdicion(): void {
    this.modoCreacion.set(false);
    this.formacionEnEdicion.set(null);
  }

  guardarEnLocalStorage(): void {
    const personalizadas = this.formaciones().filter(f => f.personalizada);
    localStorage.setItem('formaciones_personalizadas', JSON.stringify(personalizadas));
  }

  contarPorTipo(tipo: string): number {
    const formacion = this.formacionEnEdicion();
    if (!formacion) return 0;
    return formacion.posiciones.filter(p => p.posicion === tipo).length;
  }

  contarPorTipo11(): number {
    return this.formaciones().filter(f => f.tipo === '11').length;
  }

  contarPorTipo6(): number {
    return this.formaciones().filter(f => f.tipo === '6').length;
  }
  
  contarTotal(): number {
    return this.formaciones().length;
  }

  esFormacionCompleta(): boolean {
    const formacion = this.formacionEnEdicion();
    if (!formacion || !formacion.posiciones) return false;
    
    const requeridos = formacion.tipo === '11' ? 11 : 6;
    return formacion.posiciones.length === requeridos;
  }

  private mostrarToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType.set(type);
    this.toastTitle.set(title);
    this.toastMessage.set(message);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 5000);
  }
}