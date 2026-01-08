import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrganizadorService, Campeonato, Equipo, Inscripcion, Partido } from '../../services/organizador.service';
import { DatepickerComponent } from '../../../../shared/components/datepicker/datepicker.component';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

type EstadoCampeonato = 'planificacion' | 'inscripciones_abiertas' | 'en_curso' | 'finalizado' | 'cancelado';

@Component({
  selector: 'app-mi-campeonato',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    ReactiveFormsModule,
    DatepickerComponent,
    ToastComponent,
    ImagePlaceholderComponent
  ],
  templateUrl: './mi-campeonato.component.html',
  styleUrls: ['./mi-campeonato.component.scss']
})
export class MiCampeonatoComponent implements OnInit {
  // Tabs
  activeTab = signal<'informacion' | 'equipos' | 'fixture' | 'configuracion'>('informacion');
  
  // Loading states
  loading = signal(false);
  loadingCampeonatos = signal(false);
  
  // Datos
  misCampeonatos = signal<Campeonato[]>([]);
  campeonatoActual = signal<Campeonato | null>(null);
  idCampeonatoActual = signal<number | null>(null);
  equiposInscritos = signal<Equipo[]>([]);
  solicitudesPendientes = signal<Inscripcion[]>([]);
  partidos = signal<Partido[]>([]);
  
  // UI States
  showEstadoDropdown = signal(false);
  showCampeonatosDropdown = signal(false);
  showEditarModal = signal(false);
  showGuardarModal = signal(false);
  
  // Logo upload
  logoFile = signal<File | null>(null);
  previewLogo = signal<string | null>(null);
  logoError = signal<boolean>(false);
  
  // Filtro de fixture
  filtroEstado = signal<'todos' | 'programado' | 'finalizado'>('todos');
  
  // Paginación por jornadas
  jornadaActual = signal<number | null>(null);
  modoVista = signal<'jornadas' | 'fechas'>('jornadas'); // 'jornadas' o 'fechas'
  
  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');
  
  // Forms
  editarForm!: FormGroup;
  configuracionForm!: FormGroup;

  // Stats
  stats = signal({
    equiposRegistrados: 0,
    partidosTotales: 0,
    partidosJugados: 0,
    golesTotales: 0
  });

  constructor(
    private organizadorService: OrganizadorService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.inicializarForms();
  }

  ngOnInit(): void {
    this.cargarMisCampeonatos();
  }

  inicializarForms(): void {
    this.editarForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required]
    });

    this.configuracionForm = this.fb.group({
      tipo_competicion: ['liga', Validators.required],
      max_equipos: [16, [Validators.required, Validators.min(2), Validators.max(64)]],
      fecha_inicio_inscripciones: [''],
      fecha_cierre_inscripciones: [''],
      inscripciones_abiertas: [true]
    });
  }

  // ==================== CARGA DE DATOS ====================

  cargarMisCampeonatos(): void {
    this.loadingCampeonatos.set(true);
    
    this.organizadorService.obtenerMisCampeonatos().subscribe({
      next: (campeonatos) => {
        this.misCampeonatos.set(campeonatos);
        
        if (campeonatos.length > 0) {
          this.seleccionarCampeonato(campeonatos[0].id_campeonato);
        }
        
        this.loadingCampeonatos.set(false);
      },
      error: (error) => {
        console.error('Error al cargar campeonatos:', error);
        this.mostrarToast('error', 'Error', 'No se pudieron cargar tus campeonatos');
        this.loadingCampeonatos.set(false);
      }
    });
  }

  seleccionarCampeonato(idCampeonato: number): void {
    this.idCampeonatoActual.set(idCampeonato);
    this.showCampeonatosDropdown.set(false);
    this.cargarCampeonato(idCampeonato);
  }

  cargarCampeonato(idCampeonato: number): void {
    this.loading.set(true);
    this.logoError.set(false); // Reset error state

    this.organizadorService.obtenerCampeonatoPorId(idCampeonato).subscribe({
      next: (response: any) => {
        const campeonato = response.campeonato || response;
        console.log('🏆 Campeonato cargado:', campeonato);
        console.log('🖼️ Logo URL:', campeonato.logo_url);
        
        // Asegurarse de que logo_url existe y no está vacío
        if (campeonato.logo_url && campeonato.logo_url.trim() !== '') {
          console.log('✅ Logo URL válida:', campeonato.logo_url);
        } else {
          console.warn('⚠️ Logo URL no disponible o vacía');
        }
        
        this.campeonatoActual.set(campeonato);
        
        this.editarForm.patchValue({
          nombre: campeonato.nombre,
          descripcion: campeonato.descripcion,
          fecha_inicio: campeonato.fecha_inicio,
          fecha_fin: campeonato.fecha_fin
        });

        this.configuracionForm.patchValue({
          tipo_competicion: campeonato.tipo_competicion || 'liga',
          max_equipos: campeonato.max_equipos || 16,
          fecha_inicio_inscripciones: campeonato.fecha_inicio_inscripciones || '',
          fecha_cierre_inscripciones: campeonato.fecha_cierre_inscripciones || '',
          inscripciones_abiertas: campeonato.inscripciones_abiertas || false
        });
        
        this.cargarEquipos(idCampeonato);
        this.cargarSolicitudes(idCampeonato);
        this.cargarPartidos(idCampeonato);
        
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar campeonato:', error);
        this.mostrarToast('error', 'Error', 'No se pudo cargar la información del campeonato');
        this.loading.set(false);
      }
    });
  }

  cargarEquipos(idCampeonato: number): void {
    this.organizadorService.obtenerInscripcionesPorCampeonato(idCampeonato).subscribe({
      next: (response: any) => {
        console.log('📦 Respuesta inscripciones:', response);
        
        const inscripciones = response.inscripciones || response || [];
        console.log('📋 Total inscripciones:', inscripciones.length);
        
        const aprobadas = inscripciones.filter((i: any) => i.estado_inscripcion === 'aprobado');
        console.log('✅ Aprobadas:', aprobadas.length);
        
        const equipos: Equipo[] = aprobadas
          .filter((i: any) => i.equipo)
          .map((i: any) => i.equipo);
        
        console.log('⚽ Equipos cargados:', equipos);
        
        this.equiposInscritos.set(equipos);
        this.stats.update(s => ({ ...s, equiposRegistrados: equipos.length }));
      },
      error: (error) => {
        console.error('❌ Error al cargar equipos:', error);
        this.equiposInscritos.set([]);
        this.stats.update(s => ({ ...s, equiposRegistrados: 0 }));
      }
    });
  }

  cargarSolicitudes(idCampeonato: number): void {
    this.organizadorService.obtenerInscripcionesPorCampeonato(idCampeonato).subscribe({
      next: (response: any) => {
        const inscripciones = response.inscripciones || response || [];
        const pendientes = inscripciones.filter((i: any) => i.estado_inscripcion === 'pendiente');
        this.solicitudesPendientes.set(pendientes);
      },
      error: (error) => {
        console.error('Error al cargar solicitudes:', error);
      }
    });
  }

  cargarPartidos(idCampeonato: number): void {
    this.organizadorService.obtenerPartidosPorCampeonato(idCampeonato).subscribe({
      next: (response: any) => {
        console.log('🏟️ Respuesta partidos:', response);
        
        const partidos = response.partidos || response || [];
        console.log('⚽ Partidos encontrados:', partidos.length);
        
        this.partidos.set(partidos);
        
        const jugados = partidos.filter((p: Partido) => p.estado === 'finalizado').length;
        const golesTotales = partidos.reduce((total: number, p: Partido) => {
          return total + (p.goles_local || 0) + (p.goles_visitante || 0);
        }, 0);
        
        this.stats.update(s => ({ 
          ...s, 
          partidosTotales: partidos.length,
          partidosJugados: jugados,
          golesTotales: golesTotales
        }));
        
        // Establecer jornada actual (primera jornada disponible o la más reciente)
        const jornadas = this.getJornadasDisponibles();
        if (jornadas.length > 0) {
          this.jornadaActual.set(jornadas[0]);
        }
        
        console.log('📊 Stats actualizadas:', this.stats());
      },
      error: (error) => {
        console.error('❌ Error al cargar partidos:', error);
        this.partidos.set([]);
        this.jornadaActual.set(null);
        this.stats.update(s => ({ 
          ...s, 
          partidosTotales: 0,
          partidosJugados: 0,
          golesTotales: 0
        }));
      }
    });
  }

  // ==================== ACCIONES ====================

  abrirEditarModal(): void {
    const campeonato = this.campeonatoActual();
    if (!campeonato) return;

    this.editarForm.patchValue({
      nombre: campeonato.nombre,
      descripcion: campeonato.descripcion,
      fecha_inicio: campeonato.fecha_inicio,
      fecha_fin: campeonato.fecha_fin
    });

    // Reset logo preview
    this.logoFile.set(null);
    this.previewLogo.set(null);

    this.showEditarModal.set(true);
  }

  cerrarEditarModal(): void {
    this.showEditarModal.set(false);
    this.logoFile.set(null);
    this.previewLogo.set(null);
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        this.mostrarToast('error', 'Formato inválido', 'Por favor selecciona una imagen válida');
        return;
      }
      
      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.mostrarToast('error', 'Archivo muy grande', 'El archivo no debe superar los 5MB');
        return;
      }
      
      this.logoFile.set(file);
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewLogo.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarLogo(): void {
    this.logoFile.set(null);
    this.previewLogo.set(null);
  }

  guardarEdicion(): void {
    if (this.editarForm.invalid) {
      this.mostrarToast('warning', 'Formulario incompleto', 'Por favor completa todos los campos requeridos');
      return;
    }

    const campeonato = this.campeonatoActual();
    if (!campeonato) return;

    // Si hay un logo nuevo, subirlo primero
    const logoFile = this.logoFile();
    if (logoFile) {
      this.organizadorService.subirLogoCampeonato(campeonato.id_campeonato, logoFile).subscribe({
        next: (response: any) => {
          console.log('✅ Logo subido exitosamente:', response);
          // Actualizar con la URL del logo si viene en la respuesta
          if (response.logo_url) {
            console.log('🖼️ Logo URL recibida:', response.logo_url);
            this.editarForm.patchValue({ logo_url: response.logo_url });
            // Actualizar inmediatamente el campeonato actual con el logo
            const campeonatoActualizado = { ...this.campeonatoActual()!, logo_url: response.logo_url };
            console.log('🔄 Actualizando campeonato con logo:', campeonatoActualizado);
            this.campeonatoActual.set(campeonatoActualizado);
            this.logoError.set(false); // Reset error state
          }
          // Continuar con actualización normal
          this.actualizarCampeonato();
        },
        error: (error) => {
          console.error('Error al subir logo:', error);
          this.mostrarToast('error', 'Error al subir logo', 'No se pudo subir el logo. Se guardarán los demás cambios.');
          // Continuar con actualización sin logo
          this.actualizarCampeonato();
        }
      });
    } else {
      this.actualizarCampeonato();
    }
  }

  private actualizarCampeonato(): void {
    const campeonato = this.campeonatoActual();
    if (!campeonato) return;

    // Solo enviar los campos permitidos para actualización
    // Asegurar que las fechas estén en formato YYYY-MM-DD
    const formValue = this.editarForm.value;
    const datosActualizados: any = {
      nombre: formValue.nombre?.trim(),
      descripcion: formValue.descripcion?.trim(),
    };

    // Formatear fechas correctamente
    if (formValue.fecha_inicio) {
      const fechaInicio = new Date(formValue.fecha_inicio);
      datosActualizados.fecha_inicio = fechaInicio.toISOString().split('T')[0];
    }
    
    if (formValue.fecha_fin) {
      const fechaFin = new Date(formValue.fecha_fin);
      datosActualizados.fecha_fin = fechaFin.toISOString().split('T')[0];
    }

    // Incluir logo_url si está en el formulario
    if (formValue.logo_url) {
      datosActualizados.logo_url = formValue.logo_url;
    }

    this.organizadorService.actualizarCampeonato(campeonato.id_campeonato, datosActualizados).subscribe({
      next: () => {
        this.mostrarToast('success', 'Cambios guardados', 'El campeonato se actualizó correctamente');
        this.cerrarEditarModal();
        this.logoFile.set(null);
        this.previewLogo.set(null);
        // Recargar el campeonato para obtener el logo_url actualizado desde la BD
        setTimeout(() => {
          this.cargarCampeonato(campeonato.id_campeonato);
        }, 100);
      },
      error: (error) => {
        console.error('Error al actualizar campeonato:', error);
        const mensaje = error.error?.error || error.message || 'No se pudieron guardar los cambios';
        this.mostrarToast('error', 'Error al guardar', mensaje);
      }
    });
  }

  cambiarEstado(nuevoEstado: EstadoCampeonato): void {
    const campeonato = this.campeonatoActual();
    if (!campeonato) return;

    this.organizadorService.cambiarEstadoCampeonato(campeonato.id_campeonato, nuevoEstado as any).subscribe({
      next: () => {
        this.campeonatoActual.set({...campeonato, estado: nuevoEstado as any});
        this.showEstadoDropdown.set(false);
        this.mostrarToast('success', 'Estado actualizado', `El campeonato ahora está en: ${this.getEstadoLabel(nuevoEstado)}`);
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
        this.mostrarToast('error', 'No se pudo cambiar el estado', 'Ocurrió un error al actualizar el estado del campeonato');
        this.showEstadoDropdown.set(false);
      }
    });
  }

  guardarConfiguracion(): void {
    if (this.configuracionForm.invalid) {
      this.mostrarToast('warning', 'Formulario incompleto', 'Por favor completa todos los campos requeridos');
      return;
    }

    const campeonato = this.campeonatoActual();
    if (!campeonato) return;

    const datosActualizados = {
      ...campeonato,
      ...this.configuracionForm.value
    };

    this.organizadorService.actualizarCampeonato(campeonato.id_campeonato, datosActualizados).subscribe({
      next: () => {
        this.mostrarToast('success', 'Configuración guardada', 'Los cambios se aplicaron correctamente');
        this.cargarCampeonato(campeonato.id_campeonato);
      },
      error: (error) => {
        console.error('Error al guardar configuración:', error);
        this.mostrarToast('error', 'Error al guardar', 'No se pudieron guardar los cambios de configuración');
      }
    });
  }

  // ==================== UI HELPERS ====================

  onLogoError(event: any): void {
    console.error('❌ Error al cargar logo:', event);
    console.error('URL intentada:', this.campeonatoActual()?.logo_url);
    this.logoError.set(true);
  }

  onLogoLoad(): void {
    console.log('✅ Logo cargado exitosamente:', this.campeonatoActual()?.logo_url);
    this.logoError.set(false);
  }

  setActiveTab(tab: 'informacion' | 'equipos' | 'fixture' | 'configuracion'): void {
    this.activeTab.set(tab);
  }

  toggleEstadoDropdown(): void {
    this.showEstadoDropdown.update(v => !v);
  }

  toggleCampeonatosDropdown(): void {
    this.showCampeonatosDropdown.update(v => !v);
  }

  getEstadoLabel(estado?: string): string {
    const estadoActual = estado || this.campeonatoActual()?.estado || '';
    const labels: { [key: string]: string } = {
      'planificacion': 'Planificación',
      'inscripciones_abiertas': 'Inscripciones Abiertas',
      'en_curso': 'En Curso',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado'
    };
    return labels[estadoActual] || estadoActual;
  }

  getEstadoColor(): string {
    const estado = this.campeonatoActual()?.estado || '';
    const colors: { [key: string]: string } = {
      'planificacion': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'inscripciones_abiertas': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'en_curso': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'finalizado': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      'cancelado': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[estado] || 'bg-gray-100 text-gray-700';
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

  // ==================== NAVEGACIÓN ====================

  irAEquipoDetalle(idEquipo: number): void {
    this.router.navigate(['/organizador/equipos', idEquipo]);
  }

  verSolicitudes(): void {
    const idCampeonato = this.campeonatoActual()?.id_campeonato;
    if (idCampeonato) {
      this.router.navigate(['/organizador/ver-solicitudes', idCampeonato]);
    } else {
      this.mostrarToast('error', 'Error', 'No hay campeonato seleccionado');
    }
  }

  generarFixture(): void {
    const idCampeonato = this.campeonatoActual()?.id_campeonato;
    if (idCampeonato) {
      this.router.navigate(['/organizador/generar-fixture', idCampeonato]);
    } else {
      this.mostrarToast('error', 'Error', 'No hay campeonato seleccionado');
    }
  }

  descargarReporte(): void {
    this.mostrarToast('info', 'Generando reporte', 'El reporte se descargará en unos momentos...');
  }

  // ==================== FIXTURE - MÉTODOS MEJORADOS ====================

  // Obtener jornadas disponibles
  getJornadasDisponibles(): number[] {
    const jornadas = new Set(
      this.partidos().map(p => p.jornada || 1)
    );
    return Array.from(jornadas).sort((a, b) => a - b);
  }

  // Obtener partidos por jornada
  getPartidosPorJornada(jornada: number): Partido[] {
    return this.partidos().filter(p => (p.jornada || 1) === jornada);
  }

  // Obtener partidos de la jornada actual filtrados
  getPartidosJornadaActual(): Partido[] {
    const jornada = this.jornadaActual();
    if (jornada === null) return [];
    
    let partidos = this.getPartidosPorJornada(jornada);
    
    const filtro = this.filtroEstado();
    if (filtro !== 'todos') {
      partidos = partidos.filter(p => p.estado === filtro);
    }
    
    return partidos.sort((a, b) => {
      const fechaA = new Date(a.fecha_partido).getTime();
      const fechaB = new Date(b.fecha_partido).getTime();
      return fechaA - fechaB;
    });
  }

  // Obtener fechas de partidos de la jornada actual
  getFechasJornadaActual(): string[] {
    const partidos = this.getPartidosJornadaActual();
    const fechas = new Set(
      partidos.map(p => p.fecha_partido.split('T')[0])
    );
    return Array.from(fechas).sort();
  }

  // Agrupar partidos por fecha dentro de la jornada actual
  getPartidosPorFechaEnJornada(fecha: string): Partido[] {
    return this.getPartidosJornadaActual().filter(p => p.fecha_partido.startsWith(fecha));
  }

  // Navegación de jornadas
  irAJornadaAnterior(): void {
    const jornadas = this.getJornadasDisponibles();
    const actual = this.jornadaActual();
    if (actual === null) return;
    
    const indiceActual = jornadas.indexOf(actual);
    if (indiceActual > 0) {
      this.jornadaActual.set(jornadas[indiceActual - 1]);
    }
  }

  irAJornadaSiguiente(): void {
    const jornadas = this.getJornadasDisponibles();
    const actual = this.jornadaActual();
    if (actual === null) return;
    
    const indiceActual = jornadas.indexOf(actual);
    if (indiceActual < jornadas.length - 1) {
      this.jornadaActual.set(jornadas[indiceActual + 1]);
    }
  }

  seleccionarJornada(jornada: number): void {
    this.jornadaActual.set(jornada);
  }

  // Métodos legacy para vista por fechas (mantener compatibilidad)
  getPartidosPorFecha(fecha: string): Partido[] {
    return this.partidos().filter(p => p.fecha_partido.startsWith(fecha));
  }

  getPartidosFiltrados(fecha: string): Partido[] {
    let partidos = this.getPartidosPorFecha(fecha);
    
    const filtro = this.filtroEstado();
    if (filtro !== 'todos') {
      partidos = partidos.filter(p => p.estado === filtro);
    }
    
    return partidos;
  }

  getDiasConPartidos(): string[] {
    const fechas = new Set(
      this.partidos().map(p => p.fecha_partido.split('T')[0])
    );
    return Array.from(fechas).sort();
  }

  // Estadísticas de jornada actual
  getStatsJornadaActual(): { total: number; finalizados: number; programados: number } {
    const jornada = this.jornadaActual();
    if (jornada === null) {
      return { total: 0, finalizados: 0, programados: 0 };
    }
    const partidos = this.getPartidosPorJornada(jornada);
    return {
      total: partidos.length,
      finalizados: partidos.filter(p => p.estado === 'finalizado').length,
      programados: partidos.filter(p => p.estado === 'programado').length
    };
  }

  obtenerNombreEquipo(idEquipo: number): string {
    const equipo = this.equiposInscritos().find(e => e.id_equipo === idEquipo);
    return equipo?.nombre || `Equipo ${idEquipo}`;
  }

  obtenerLogoEquipo(idEquipo: number): string | null {
    const equipo = this.equiposInscritos().find(e => e.id_equipo === idEquipo);
    return equipo?.logo_url || null;
  }

  getEstadoPartidoClasses(estado: string): string {
    const classes: { [key: string]: string } = {
      'programado': 'px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold',
      'en_curso': 'px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold',
      'finalizado': 'px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold',
      'suspendido': 'px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold',
      'cancelado': 'px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 text-xs font-bold'
    };
    return classes[estado] || classes['programado'];
  }

  getEstadoPartidoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'programado': 'Por jugar',
      'en_curso': 'En curso',
      'finalizado': 'Finalizado',
      'suspendido': 'Suspendido',
      'cancelado': 'Cancelado'
    };
    return labels[estado] || estado;
  }

  verDetallePartido(idPartido: number): void {
    this.router.navigate(['/organizador/partidos', idPartido]);
  }

  formatearHora(fecha: string): string {
    return fecha.split('T')[1]?.substring(0, 5) || '00:00';
  }

  formatearFecha(fecha: string): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    const date = new Date(fecha + 'T00:00:00');
    const diaSemana = dias[date.getDay()];
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    
    return `${diaSemana} ${dia} de ${mes}`;
  }

  // ==================== CONFIGURACIÓN ====================

  onConfigChange(campo: string, valor: any): void {
    this.configuracionForm.patchValue({ [campo]: valor });
  }

  toggleInscripciones(): void {
    const campeonato = this.campeonatoActual();
    if (!campeonato) return;

    const nuevoEstado = !this.configuracionForm.value.inscripciones_abiertas;
    
    this.configuracionForm.patchValue({ inscripciones_abiertas: nuevoEstado });
    
    this.mostrarToast(
      'info', 
      nuevoEstado ? 'Inscripciones abiertas' : 'Inscripciones cerradas',
      nuevoEstado ? 'Los equipos ya pueden inscribirse' : 'Las inscripciones están cerradas'
    );
  }
}