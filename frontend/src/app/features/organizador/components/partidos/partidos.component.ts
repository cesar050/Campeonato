import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizadorService, Partido, Campeonato, Equipo } from '../../services/organizador.service';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { DatepickerComponent } from '../../../../shared/components/datepicker/datepicker.component';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

@Component({
  selector: 'app-partidos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ToastComponent,
    DatepickerComponent,
    ImagePlaceholderComponent
  ],
  templateUrl: './partidos.component.html',
  styleUrls: ['./partidos.component.scss']
})
export class PartidosComponent implements OnInit {
  // Estados
  loading = signal(false);
  loadingEquipos = signal(false);
  partidos = signal<Partido[]>([]);
  misCampeonatos = signal<Campeonato[]>([]);
  equiposInscritos = signal<Equipo[]>([]);
  
  // Filtros y vista
  campeonatoSeleccionado = signal<number | null>(null);
  vistaActual = signal<'lista' | 'tabla'>('lista');
  filtroEstado = signal<'todos' | 'programado' | 'finalizado'>('todos');
  
  // Paginación por jornadas
  jornadaActual = signal<number | null>(null);

  // Tabla de posiciones
  tablaPosiciones = signal<any[]>([]);
  loadingTabla = signal(false);
  
  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');

  // Modal de edición
  showEditarModal = signal(false);
  partidoEditando = signal<Partido | null>(null);
  fechaEdicion = signal<string>('');
  horaEdicion = signal<string>('');
  lugarEdicion = signal<string>('');
  mensajeEdicion = signal<string>('');
  guardando = signal(false);

  // Estadísticas
  stats = signal({
    partidosTotales: 0,
    partidosJugados: 0,
    golesTotales: 0
  });

  constructor(
    private organizadorService: OrganizadorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarMisCampeonatos();
  }

  cargarMisCampeonatos(): void {
    this.organizadorService.obtenerMisCampeonatos().subscribe({
      next: (campeonatos) => {
        this.misCampeonatos.set(campeonatos);
        if (campeonatos.length > 0) {
          this.campeonatoSeleccionado.set(campeonatos[0].id_campeonato);
          this.cargarPartidos();
          this.cargarTablaPosiciones();
          this.cargarEquipos(campeonatos[0].id_campeonato);
        }
      },
      error: (error) => {
        console.error('Error al cargar campeonatos:', error);
        this.mostrarToast('error', 'Error', 'No se pudieron cargar los campeonatos');
      }
    });
  }

  cargarPartidos(): void {
    const idCampeonato = this.campeonatoSeleccionado();
    if (!idCampeonato) return;
  
    this.loading.set(true);
    
    this.organizadorService.obtenerPartidosPorCampeonato(idCampeonato).subscribe({
      next: (response) => {
        const partidos = response.partidos || response || [];
        this.partidos.set(partidos);
        
        // Calcular estadísticas
        const jugados = partidos.filter((p: Partido) => p.estado === 'finalizado').length;
        const golesTotales = partidos.reduce((total: number, p: Partido) => {
          return total + (p.goles_local || 0) + (p.goles_visitante || 0);
        }, 0);
        
        this.stats.set({
          partidosTotales: partidos.length,
          partidosJugados: jugados,
          golesTotales: golesTotales
        });
        
        // Establecer jornada actual
        const jornadas = this.getJornadasDisponibles();
        if (jornadas.length > 0) {
          this.jornadaActual.set(jornadas[0]);
        }
        
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar partidos:', error);
        this.mostrarToast('error', 'Error', 'No se pudieron cargar los partidos');
        this.loading.set(false);
      }
    });
  }

  cargarEquipos(idCampeonato: number): void {
    this.loadingEquipos.set(true);
    
    this.organizadorService.obtenerInscripcionesPorCampeonato(idCampeonato).subscribe({
      next: (response: any) => {
        const inscripciones = response.inscripciones || response || [];
        const aprobadas = inscripciones.filter((i: any) => i.estado_inscripcion === 'aprobado');
        
        const equipos: Equipo[] = aprobadas
          .filter((i: any) => i.equipo)
          .map((i: any) => i.equipo);
        
        this.equiposInscritos.set(equipos);
        this.loadingEquipos.set(false);
      },
      error: (error) => {
        console.error('Error al cargar equipos:', error);
        this.equiposInscritos.set([]);
        this.loadingEquipos.set(false);
      }
    });
  }

  cargarTablaPosiciones(): void {
    const campeonatoId = this.campeonatoSeleccionado();
    if (!campeonatoId) return;
    
    this.loadingTabla.set(true);
    
    this.organizadorService.obtenerTablaPosiciones(campeonatoId).subscribe({
      next: (response: any) => {
        this.tablaPosiciones.set(response.tabla || []);
        this.loadingTabla.set(false);
      },
      error: (error: any) => {
        console.error('Error al cargar tabla de posiciones:', error);
        this.mostrarToast('error', 'Error', 'No se pudo cargar la tabla de posiciones');
        this.loadingTabla.set(false);
      }
    });
  }

  cambiarCampeonato(): void {
    const idCampeonato = this.campeonatoSeleccionado();
    if (idCampeonato) {
      this.cargarPartidos();
      this.cargarTablaPosiciones();
      this.cargarEquipos(idCampeonato);
    }
  }

  cambiarVista(vista: 'lista' | 'tabla'): void {
    this.vistaActual.set(vista);
    
    if (vista === 'tabla') {
      this.cargarTablaPosiciones();
    }
  }

  // ==================== JORNADAS ====================

  getJornadasDisponibles(): number[] {
    const jornadas = new Set(
      this.partidos().map(p => p.jornada || 1)
    );
    return Array.from(jornadas).sort((a, b) => a - b);
  }

  getPartidosPorJornada(jornada: number): Partido[] {
    return this.partidos().filter(p => (p.jornada || 1) === jornada);
  }

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

  getFechasJornadaActual(): string[] {
    const partidos = this.getPartidosJornadaActual();
    const fechas = new Set(
      partidos.map(p => p.fecha_partido.split('T')[0])
    );
    return Array.from(fechas).sort();
  }

  getPartidosPorFechaEnJornada(fecha: string): Partido[] {
    return this.getPartidosJornadaActual().filter(p => p.fecha_partido.startsWith(fecha));
  }

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

  // ==================== EQUIPOS ====================

  obtenerNombreEquipo(idEquipo: number): string {
    const equipo = this.equiposInscritos().find(e => e.id_equipo === idEquipo);
    return equipo?.nombre || `Equipo ${idEquipo}`;
  }

  obtenerLogoEquipo(idEquipo: number): string | null {
    const equipo = this.equiposInscritos().find(e => e.id_equipo === idEquipo);
    return equipo?.logo_url || null;
  }

  // ==================== EDICIÓN ====================

  verDetallePartido(idPartido: number): void {
    this.router.navigate(['/organizador/partidos', idPartido]);
  }

  editarPartido(partido: Partido, event: Event): void {
    event.stopPropagation();
    
    if (partido.estado === 'finalizado') {
      this.mostrarToast('warning', 'No se puede editar', 'No se puede editar un partido finalizado');
      return;
    }

    this.partidoEditando.set(partido);
    
    const fechaPartido = new Date(partido.fecha_partido);
    const año = fechaPartido.getFullYear();
    const mes = String(fechaPartido.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaPartido.getDate()).padStart(2, '0');
    const hora = String(fechaPartido.getHours()).padStart(2, '0');
    const minutos = String(fechaPartido.getMinutes()).padStart(2, '0');
    
    this.fechaEdicion.set(`${año}-${mes}-${dia}`);
    this.horaEdicion.set(`${hora}:${minutos}`);
    this.lugarEdicion.set(partido.lugar || '');
    this.mensajeEdicion.set('');
    
    this.showEditarModal.set(true);
  }

  cerrarEditarModal(): void {
    this.showEditarModal.set(false);
    this.partidoEditando.set(null);
    this.fechaEdicion.set('');
    this.horaEdicion.set('');
    this.lugarEdicion.set('');
    this.mensajeEdicion.set('');
  }

  guardarCambiosPartido(): void {
    const partido = this.partidoEditando();
    if (!partido) return;

    if (!this.fechaEdicion() || !this.horaEdicion()) {
      this.mostrarToast('error', 'Error', 'La fecha y hora son obligatorias');
      return;
    }

    this.guardando.set(true);

    const fechaHora = `${this.fechaEdicion()} ${this.horaEdicion()}:00`;

    const datos: any = {
      fecha_partido: fechaHora
    };

    if (this.lugarEdicion()) {
      datos.lugar = this.lugarEdicion();
    }

    if (this.mensajeEdicion()) {
      datos.mensaje = this.mensajeEdicion();
    }

    this.organizadorService.reprogramarPartido(partido.id_partido, datos).subscribe({
      next: (response) => {
        this.guardando.set(false);
        this.mostrarToast('success', 'Partido actualizado', 'El partido ha sido reprogramado exitosamente');
        this.cerrarEditarModal();
        this.cargarPartidos();
      },
      error: (error) => {
        this.guardando.set(false);
        console.error('Error al reprogramar partido:', error);
        const mensajeError = error?.error?.error || 'No se pudo reprogramar el partido';
        this.mostrarToast('error', 'Error', mensajeError);
      }
    });
  }

  generarFixtureAutomatico(): void {
    const idCampeonato = this.campeonatoSeleccionado();
    if (!idCampeonato) return;
    
    this.router.navigate(['/organizador/generar-fixture', idCampeonato]);
  }

  // ==================== UTILIDADES ====================

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

  formatearFecha(fecha: string): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    const date = new Date(fecha + 'T00:00:00');
    const diaSemana = dias[date.getDay()];
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    
    return `${diaSemana} ${dia} de ${mes}`;
  }

  formatearHora(fecha: string): string {
    return fecha.split('T')[1]?.substring(0, 5) || '00:00';
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
}