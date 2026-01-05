import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { LiderEquipoService } from '../../services/lider-equipo.service';
import { Equipo, Jugador } from '../../models/lider-equipo.models';
import { SafePipe } from '../../../../core/pipes/safe.pipe';

@Component({
  selector: 'app-jugadores',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SafePipe],
  templateUrl: './jugadores.component.html',
  styleUrls: ['./jugadores.component.scss']
})
export class JugadoresComponent implements OnInit {
  // Estados
  loading = signal(true);
  showModal = signal(false);
  isEditing = signal(false);
  uploadingDocument = signal(false);

  // Datos
  misEquipos = signal<Equipo[]>([]);
  equipoSeleccionado = signal<number | null>(null);
  jugadores = signal<Jugador[]>([]);
  jugadorEditando = signal<Jugador | null>(null);

  // Paginación
  paginaActual = signal(1);
  totalPaginas = signal(1);
  totalItems = signal(0);
  itemsPorPagina = signal(5);

  // Filtros
  buscarTexto = signal('');
  posicionFilter = signal('');

  // Formulario
  jugadorForm!: FormGroup;

  // Para el template
  Math = Math;

  // Documentos y fotos
  documentoFile: File | null = null;
  fotoFile: File | null = null;
  fotoPreview: string | null = null;

  // Visor de PDFs
  showPDFViewer = signal(false);
  currentPDFUrl = signal<string | null>(null);
  currentJugadorPDF = signal<Jugador | null>(null);
  allJugadoresConPDF: Jugador[] = [];
  currentPDFIndex = signal(0);

  constructor(
    private liderService: LiderEquipoService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.cargarEquipos();
    
    // Verificar si viene equipo en query params
    this.route.queryParams.subscribe(params => {
      if (params['equipo']) {
        this.equipoSeleccionado.set(parseInt(params['equipo']));
      }
    });
  }

  initForm(): void {
    this.jugadorForm = this.fb.group({
      id_equipo: ['', Validators.required],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      documento: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      dorsal: ['', [Validators.required, Validators.min(1), Validators.max(99)]],
      posicion: ['delantero', Validators.required],
      fecha_nacimiento: ['', Validators.required]
    });
  }

  // ============================================
  // MANEJO DE ARCHIVOS
  // ============================================
  onDocumentoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validar que sea PDF
      if (file.type !== 'application/pdf') {
        alert('Solo se permiten archivos PDF');
        input.value = '';
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo no debe superar 5MB');
        input.value = '';
        return;
      }

      this.documentoFile = file;
    }
  }

  onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        alert('Solo se permiten archivos de imagen');
        input.value = '';
        return;
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe superar 2MB');
        input.value = '';
        return;
      }

      this.fotoFile = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fotoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeFotoPreview(): void {
    this.fotoFile = null;
    this.fotoPreview = null;
  }

  removeDocumento(): void {
    this.documentoFile = null;
  }

  // ============================================
  // VISOR DE PDF
  // ============================================
  verPDF(jugador: Jugador): void {
    if (!jugador.documento_pdf) {
      alert('Este jugador no tiene documento PDF cargado');
      return;
    }

    // Obtener todos los jugadores que tienen PDF
    this.allJugadoresConPDF = this.jugadores().filter(j => j.documento_pdf);
    
    // Encontrar el índice del jugador actual
    const index = this.allJugadoresConPDF.findIndex(j => j.id_jugador === jugador.id_jugador);
    this.currentPDFIndex.set(index);

    // Mostrar el PDF
    this.currentPDFUrl.set(jugador.documento_pdf);
    this.currentJugadorPDF.set(jugador);
    this.showPDFViewer.set(true);
  }

  cerrarPDFViewer(): void {
    this.showPDFViewer.set(false);
    this.currentPDFUrl.set(null);
    this.currentJugadorPDF.set(null);
  }

  anteriorPDF(): void {
    const currentIndex = this.currentPDFIndex();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      this.currentPDFIndex.set(prevIndex);
      const jugador = this.allJugadoresConPDF[prevIndex];
      this.currentPDFUrl.set(jugador.documento_pdf!);
      this.currentJugadorPDF.set(jugador);
    }
  }

  siguientePDF(): void {
    const currentIndex = this.currentPDFIndex();
    if (currentIndex < this.allJugadoresConPDF.length - 1) {
      const nextIndex = currentIndex + 1;
      this.currentPDFIndex.set(nextIndex);
      const jugador = this.allJugadoresConPDF[nextIndex];
      this.currentPDFUrl.set(jugador.documento_pdf!);
      this.currentJugadorPDF.set(jugador);
    }
  }

  // ============================================
  // CRUD DE JUGADORES
  // ============================================
  cargarEquipos(): void {
    this.loading.set(true);

    this.liderService.obtenerMisEquipos().subscribe({
      next: (response) => {
        this.misEquipos.set(response.equipos);
        
        if (response.equipos.length > 0) {
          const equipoId = this.equipoSeleccionado() || response.equipos[0].id_equipo;
          this.equipoSeleccionado.set(equipoId);
          this.cargarJugadores(equipoId);
        } else {
          this.loading.set(false);
        }
      },
      error: (error) => {
        console.error('Error al cargar equipos:', error);
        this.loading.set(false);
      }
    });
  }

  cargarJugadores(idEquipo: number, pagina: number = 1): void {
    this.loading.set(true);

    this.liderService.obtenerJugadores(idEquipo, {
      page: pagina,
      per_page: this.itemsPorPagina(),
      buscar: this.buscarTexto(),
      posicion: this.posicionFilter()
    }).subscribe({
      next: (response: any) => {
        this.jugadores.set(response.jugadores || []);
        
        if (response.pagination) {
          this.paginaActual.set(response.pagination.page);
          this.totalPaginas.set(response.pagination.total_pages);
          this.totalItems.set(response.pagination.total_items);
        }
        
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar jugadores:', error);
        this.loading.set(false);
      }
    });
  }

  cambiarEquipo(): void {
    const id = this.equipoSeleccionado();
    if (id) {
      this.paginaActual.set(1);
      this.buscarTexto.set('');
      this.posicionFilter.set('');
      this.cargarJugadores(id);
    }
  }

  abrirModal(jugador?: Jugador): void {
    if (jugador) {
      this.isEditing.set(true);
      this.jugadorEditando.set(jugador);
      
      this.jugadorForm.patchValue({
        id_equipo: this.equipoSeleccionado(),
        nombre: jugador.nombre,
        apellido: jugador.apellido,
        documento: jugador.documento,
        dorsal: jugador.dorsal,
        posicion: jugador.posicion,
        fecha_nacimiento: jugador.fecha_nacimiento
      });
    } else {
      this.isEditing.set(false);
      this.jugadorEditando.set(null);
      this.jugadorForm.reset({
        id_equipo: this.equipoSeleccionado(),
        posicion: 'delantero'
      });
      
      // Limpiar archivos
      this.documentoFile = null;
      this.fotoFile = null;
      this.fotoPreview = null;
    }
    
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
    this.jugadorForm.reset();
    this.jugadorEditando.set(null);
    
    // Limpiar archivos
    this.documentoFile = null;
    this.fotoFile = null;
    this.fotoPreview = null;
  }

  guardarJugador(): void {
    if (this.jugadorForm.invalid) {
      this.jugadorForm.markAllAsTouched();
      return;
    }

    // Validar que haya documento PDF si es nuevo jugador
    if (!this.isEditing() && !this.documentoFile) {
      alert('Debes cargar el documento de identidad en PDF');
      return;
    }

    const jugadorData = this.jugadorForm.value;

    if (this.isEditing() && this.jugadorEditando()) {
      // ============================================
      // EDITAR JUGADOR
      // ============================================
      const id = this.jugadorEditando()!.id_jugador;
      
      this.liderService.actualizarJugador(id, jugadorData).subscribe({
        next: () => {
          // Si hay foto nueva, subirla
          if (this.fotoFile) {
            this.subirFotoJugador(id);
          }
          
          // Si hay documento nuevo, subirlo
          if (this.documentoFile) {
            this.subirDocumentoJugador(id);
          }
          
          this.cerrarModal();
          this.cargarJugadores(this.equipoSeleccionado()!, this.paginaActual());
          alert('Jugador actualizado exitosamente');
        },
        error: (error) => {
          console.error('Error al editar jugador:', error);
          alert('Error al editar jugador: ' + (error.error?.error || 'Error desconocido'));
        }
      });
    } else {
      // ============================================
      // CREAR JUGADOR
      // ============================================
      this.liderService.crearJugador(jugadorData).subscribe({
        next: (response: any) => {
          const nuevoJugadorId = response.jugador?.id_jugador || response.id_jugador;
          
          if (!nuevoJugadorId) {
            alert('Error: No se obtuvo el ID del jugador');
            return;
          }

          // Subir documento PDF (obligatorio)
          this.subirDocumentoJugador(nuevoJugadorId);
          
          // Subir foto (opcional)
          if (this.fotoFile) {
            this.subirFotoJugador(nuevoJugadorId);
          }
          
          this.cerrarModal();
          this.cargarJugadores(this.equipoSeleccionado()!, 1);
          alert('Jugador creado exitosamente');
        },
        error: (error) => {
          console.error('Error al crear jugador:', error);
          alert('Error al crear jugador: ' + (error.error?.error || 'Error desconocido'));
        }
      });
    }
  }

  // ============================================
  // SUBIR ARCHIVOS
  // ============================================
  subirDocumentoJugador(idJugador: number): void {
    if (!this.documentoFile) return;

    const formData = new FormData();
    formData.append('documento', this.documentoFile);

    this.liderService.subirDocumentoJugador(idJugador, formData).subscribe({
      next: () => {
        console.log('✅ Documento subido exitosamente');
      },
      error: (error) => {
        console.error('❌ Error al subir documento:', error);
        alert('Advertencia: El jugador se creó pero hubo un error al subir el documento');
      }
    });
  }

  subirFotoJugador(idJugador: number): void {
    if (!this.fotoFile) return;

    const formData = new FormData();
    formData.append('foto', this.fotoFile);

    this.liderService.subirFotoJugador(idJugador, formData).subscribe({
      next: () => {
        console.log('✅ Foto subida exitosamente');
      },
      error: (error) => {
        console.error('❌ Error al subir foto:', error);
      }
    });
  }

  eliminarJugador(jugador: Jugador): void {
    if (!confirm(`¿Estás seguro de eliminar a ${jugador.nombre} ${jugador.apellido}?`)) {
      return;
    }

    this.liderService.eliminarJugador(jugador.id_jugador).subscribe({
      next: () => {
        // Si era el último de la página y no es la primera, ir a página anterior
        if (this.jugadores().length === 1 && this.paginaActual() > 1) {
          this.cargarJugadores(this.equipoSeleccionado()!, this.paginaActual() - 1);
        } else {
          this.cargarJugadores(this.equipoSeleccionado()!, this.paginaActual());
        }
        alert('Jugador eliminado exitosamente');
      },
      error: (error) => {
        console.error('Error al eliminar jugador:', error);
        alert('Error al eliminar jugador: ' + (error.error?.error || 'No se puede eliminar un jugador que ha jugado partidos'));
      }
    });
  }

  // Este método es para subir documento desde la tabla (edición rápida)
  onFileSelected(event: Event, jugador: Jugador): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validar que sea PDF
      if (file.type !== 'application/pdf') {
        alert('Solo se permiten archivos PDF');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo no debe superar 5MB');
        return;
      }

      this.uploadingDocument.set(true);

      const formData = new FormData();
      formData.append('documento', file);

      this.liderService.subirDocumentoJugador(jugador.id_jugador, formData).subscribe({
        next: () => {
          this.uploadingDocument.set(false);
          this.cargarJugadores(this.equipoSeleccionado()!, this.paginaActual());
          alert('Documento subido exitosamente');
        },
        error: (error) => {
          this.uploadingDocument.set(false);
          console.error('Error al subir documento:', error);
          alert('Error al subir documento');
        }
      });
    }
  }

  // ============================================
  // HELPERS
  // ============================================
  getPosicionTexto(posicion: string): string {
    const posiciones: any = {
      'portero': 'Portero',
      'defensa': 'Defensa',
      'mediocampista': 'Mediocampista',
      'delantero': 'Delantero'
    };
    return posiciones[posicion] || posicion;
  }

  calcularEdad(fechaNacimiento?: string): number {
    if (!fechaNacimiento) return 0;
    
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }

  // ============================================
  // MÉTODOS DE PAGINACIÓN
  // ============================================
  irAPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.cargarJugadores(this.equipoSeleccionado()!, pagina);
    }
  }

  aplicarFiltros(): void {
    // Reiniciar a página 1 cuando se aplican filtros
    this.paginaActual.set(1);
    this.cargarJugadores(this.equipoSeleccionado()!, 1);
  }

  limpiarFiltros(): void {
    this.buscarTexto.set('');
    this.posicionFilter.set('');
    this.aplicarFiltros();
  }

  getPaginas(): number[] {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const paginas: number[] = [];
    
    // Mostrar máximo 5 páginas
    let inicio = Math.max(1, actual - 2);
    let fin = Math.min(total, inicio + 4);
    
    if (fin - inicio < 4) {
      inicio = Math.max(1, fin - 4);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }
}