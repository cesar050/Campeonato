import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { LiderEquipoService } from '../../services/lider-equipo.service';
import { FormacionesService } from '../../services/formaciones.service';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { 
  Equipo, 
  Partido, 
  JugadorParaAlineacion, 
  Alineacion, 
  AlineacionDefinir,
  FormacionConfig
} from '../../models/lider-equipo.models';

@Component({
  selector: 'app-alineaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DragDropModule, ToastComponent],
  templateUrl: './alineaciones.component.html',
  styleUrls: ['./alineaciones.component.scss']
})
export class AlineacionesComponent implements OnInit {
  loading = signal(true);
  guardando = signal(false);

  misEquipos = signal<Equipo[]>([]);
  partidosDisponibles = signal<Partido[]>([]);
  partidoSeleccionado = signal<Partido | null>(null);
  jugadoresDisponibles = signal<JugadorParaAlineacion[]>([]);
  
  titularesEnCancha = signal<JugadorParaAlineacion[]>([]);
  suplentes = signal<JugadorParaAlineacion[]>([]);
  jugadoresSinAsignar = signal<JugadorParaAlineacion[]>([]);
  
  formacionActual = signal<string>('4-4-2');
  tipoFutbol = signal<'11' | '6'>('11');
  equipoSeleccionado = signal<Equipo | null>(null);
  campeonatoSeleccionado = signal<any>(null);
  equiposInscritos = signal<any[]>([]);

  // SIGNALS PARA MODAL Y COUNTDOWN
  modalAbierto = signal<boolean>(false);
  partidoParaConfigurar = signal<Partido | null>(null);
  tiempoRestante = signal<string>('');
  puedeSubirAlineacion = signal<boolean>(true);
  partidoAtrasado = signal<boolean>(false);
  minutosPenalizacion = signal<number>(0);

  // TOAST
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');

  // COMPUTED PARA FORMACIONES DINÁMICAS DESDE SERVICIO
  formacionesDisponibles = computed(() => {
    const tipo = this.tipoFutbol();
    return this.formacionesService.obtenerPorTipo(tipo);
  });

  // COMPUTED PARA POSICIONES DE CANCHA
  posicionesCancha = computed(() => {
    const formacion = this.formacionesService.obtenerPorCodigo(this.formacionActual());
    return formacion?.posiciones || [];
  });

  maxTitulares = computed(() => this.tipoFutbol() === '11' ? 11 : 6);
  maxSuplentes = computed(() => this.tipoFutbol() === '11' ? 7 : 6);

  // 🔥 GETTER EN VEZ DE COMPUTED
  get puedeGuardar(): boolean {
    const partido = this.partidoSeleccionado();
    const equipo = this.equipoSeleccionado();
    const titulares = this.titularesEnCancha().length;
    const maxTitulares = this.maxTitulares();
    
    const resultado = !!partido && !!equipo && titulares === maxTitulares;
    
    console.log('🔍 [PUEDE GUARDAR] Getter:', {
      partido: !!partido,
      equipo: !!equipo,
      titulares,
      maxTitulares,
      resultado
    });
    
    return resultado;
  }

  constructor(
    private liderService: LiderEquipoService,
    private formacionesService: FormacionesService
  ) {}

  ngOnInit(): void {
    this.cargarEquiposYCampeonatos();
  }
  
  cargarEquiposYCampeonatos(): void {
    this.loading.set(true);
    console.log('🔍 [ALINEACIONES] Cargando equipos y campeonatos...');

    this.liderService.obtenerMisEquipos().subscribe({
      next: (response: any) => {
        console.log('✅ [ALINEACIONES] Equipos recibidos:', response);
        this.misEquipos.set(response.equipos);
        
        if (response.equipos.length > 0) {
          if (response.equipos.length === 1) {
            this.seleccionarEquipo(response.equipos[0]);
          } else {
            this.loading.set(false);
          }
        } else {
          this.loading.set(false);
        }
      },
      error: (error: any) => {
        console.error('❌ [ALINEACIONES] Error al cargar equipos:', error);
        this.loading.set(false);
      }
    });
  }

  seleccionarEquipo(equipo: Equipo): void {
    console.log('🎯 [ALINEACIONES] Equipo seleccionado:', equipo);
    this.equipoSeleccionado.set(equipo);
    
    // Detectar tipo de deporte del equipo
    if (equipo.tipo_deporte === 'indoor') {
      this.tipoFutbol.set('6');
      this.formacionActual.set('1-2-2');
    } else {
      this.tipoFutbol.set('11');
      this.formacionActual.set('4-4-2');
    }
    
    // Recargar formaciones para asegurar que están actualizadas
    this.formacionesService.recargarFormaciones();
    
    // Cargar partidos programados
    this.cargarPartidosProgramados(equipo.id_equipo);
  }
  
  onEquipoChange(idEquipo: string): void {
    const equipo = this.misEquipos().find(e => e.id_equipo === +idEquipo);
    if (equipo) {
      this.seleccionarEquipo(equipo);
    }
  }
  
  onPartidoChange(idPartido: string): void {
    const partido = this.partidosDisponibles().find(p => p.id_partido === +idPartido);
    if (partido) {
      this.abrirModalConfiguracion(partido);
    }
  }
  
  cargarPartidosProgramados(idEquipo: number): void {
    console.log('🔍 [ALINEACIONES] Buscando partidos programados para equipo:', idEquipo);
    
    this.liderService.obtenerPartidos(idEquipo, {
      estado: 'programado',
      per_page: 50
    }).subscribe({
      next: (response: any) => {
        console.log('✅ [ALINEACIONES] Respuesta de partidos:', response);
        
        const partidos = (response.partidos || []).filter((p: any) => p.estado === 'programado');
        
        console.log('✅ [ALINEACIONES] Partidos programados filtrados:', partidos);
        this.partidosDisponibles.set(partidos);
        
        // Cargar equipos inscritos para obtener logos si hay partidos
        if (partidos.length > 0 && partidos[0].id_campeonato) {
          this.cargarEquiposInscritos(partidos[0].id_campeonato);
        }
        
        if (partidos.length > 0) {
          console.log('🔍 [ALINEACIONES] Hay partidos disponibles');
          this.loading.set(false);
        } else {
          console.log('⚠️ [ALINEACIONES] No hay partidos programados - Mostrando vista previa');
          this.generarJugadoresSimulados();
          this.loading.set(false);
        }
      },
      error: (error: any) => {
        console.error('❌ [ALINEACIONES] Error al cargar partidos:', error);
        this.generarJugadoresSimulados();
        this.loading.set(false);
      }
    });
  }

  generarJugadoresSimulados(): void {
    console.log('🎨 [ALINEACIONES] Generando jugadores simulados para vista previa');
    
    const maxJugadores = this.tipoFutbol() === '11' ? 18 : 12;
    const posiciones = this.tipoFutbol() === '11' 
      ? ['Portero', 'Defensa', 'Defensa', 'Defensa', 'Defensa', 
         'Mediocampista', 'Mediocampista', 'Mediocampista', 'Mediocampista',
         'Delantero', 'Delantero']
      : ['Portero', 'Defensa', 'Defensa', 'Mediocampista', 'Delantero', 'Delantero'];
    
    const jugadoresSimulados: JugadorParaAlineacion[] = [];
    
    for (let i = 1; i <= maxJugadores; i++) {
      jugadoresSimulados.push({
        id_jugador: i,
        nombre: `Jugador`,
        apellido: `${i}`,
        documento: `SIM${i.toString().padStart(3, '0')}`,
        dorsal: i,
        posicion: posiciones[(i - 1) % posiciones.length],
        activo: true,
        seleccionado: false,
        esTitular: false
      });
    }
    
    this.jugadoresDisponibles.set(jugadoresSimulados);
    this.jugadoresSinAsignar.set([...jugadoresSimulados]);
    
    console.log(`✅ [ALINEACIONES] ${maxJugadores} jugadores simulados generados`);
  }

  abrirModalConfiguracion(partido: Partido): void {
    this.partidoParaConfigurar.set(partido);
    this.modalAbierto.set(true);
    this.calcularTiempoRestante(partido);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.partidoParaConfigurar.set(null);
  }

  confirmarYConfigurarAlineacion(): void {
    const partido = this.partidoParaConfigurar();
    if (!partido) return;

    this.seleccionarPartido(partido);
    this.cerrarModal();
  }

  seleccionarPartido(partido: Partido): void {
    console.log('🔍 [ALINEACIONES] Partido seleccionado:', partido);
    
    this.partidoSeleccionado.set(partido);
    this.limpiarAlineacion();
    this.detectarTipoFutbol(partido);
    
    // Cargar equipos inscritos para obtener logos
    if (partido.id_campeonato) {
      this.cargarEquiposInscritos(partido.id_campeonato);
    }
    
    const equipoActual = this.equipoSeleccionado();
    
    if (equipoActual) {
      console.log(`🔥 [ALINEACIONES] Usando equipo: ${equipoActual.nombre} (ID: ${equipoActual.id_equipo})`);
      this.cargarJugadores(equipoActual.id_equipo, partido.id_partido);
    } else {
      console.error('❌ [ALINEACIONES] No hay equipo seleccionado');
      this.mostrarToast('error', 'Error', 'No se pudo identificar tu equipo');
    }
  }

  cargarEquiposInscritos(idCampeonato: number): void {
    this.liderService.obtenerInscripcionesPorCampeonato(idCampeonato).subscribe({
      next: (response: any) => {
        const inscripciones = response.inscripciones || response || [];
        const aprobadas = inscripciones.filter((i: any) => i.estado_inscripcion === 'aprobado');
        const equipos: any[] = aprobadas
          .filter((i: any) => i.equipo)
          .map((i: any) => i.equipo);
        this.equiposInscritos.set(equipos);
      },
      error: (error: any) => {
        console.error('Error al cargar equipos:', error);
      }
    });
  }

  obtenerLogoEquipo(idEquipo: number): string | null {
    const equipo = this.equiposInscritos().find(e => e.id_equipo === idEquipo);
    return equipo?.logo_url || null;
  }

  calcularTiempoRestante(partido: Partido): void {
    const ahora = new Date();
    const fechaPartido = new Date(partido.fecha_partido);
    const limiteAlineacion = new Date(fechaPartido.getTime() - 10 * 60 * 1000);
  
    const actualizarCountdown = () => {
      const now = new Date();
      const diff = limiteAlineacion.getTime() - now.getTime();
  
      if (diff <= 0) {
        this.tiempoRestante.set('⚠️ Tiempo expirado (aún puedes guardar)');
        this.puedeSubirAlineacion.set(true);
        return;
      }
  
      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diff % (1000 * 60)) / 1000);
  
      if (dias > 0) {
        this.tiempoRestante.set(`${dias}d ${horas}h ${minutos}m`);
      } else {
        this.tiempoRestante.set(`${horas}h ${minutos}m ${segundos}s`);
      }
      
      this.puedeSubirAlineacion.set(true);
  
      setTimeout(actualizarCountdown, 1000);
    };
  
    if (ahora < limiteAlineacion) {
      actualizarCountdown();
    } else {
      this.tiempoRestante.set('⚠️ Tiempo expirado (aún puedes guardar)');
      this.puedeSubirAlineacion.set(true);
    }
  }

  detectarTipoFutbol(partido: Partido): void {
    if ((partido as any).tipo_deporte) {
      const tipo = (partido as any).tipo_deporte;
      if (tipo === 'indoor') {
        this.tipoFutbol.set('6');
        this.formacionActual.set('1-2-2');
        return;
      } else {
        this.tipoFutbol.set('11');
        this.formacionActual.set('4-4-2');
        return;
      }
    }

    const nombre = partido.campeonato?.toLowerCase() || '';
    if (nombre.includes('indoor') || nombre.includes('fútbol 5') || nombre.includes('futbol 5')) {
      this.tipoFutbol.set('6');
      this.formacionActual.set('1-2-2');
    } else {
      if (this.equipoSeleccionado()?.tipo_deporte === 'indoor') {
        this.tipoFutbol.set('6');
        this.formacionActual.set('1-2-2');
      } else {
        this.tipoFutbol.set('11');
        this.formacionActual.set('4-4-2');
      }
    }
  }

  cargarJugadores(idEquipo: number, idPartido: number): void {
    this.loading.set(true);
    console.log(`🔍 [ALINEACIONES] Cargando jugadores del equipo ${idEquipo}...`);
  
    this.liderService.obtenerJugadores(idEquipo, { 
      per_page: 100,
      activo: true 
    }).subscribe({
      next: (response: any) => {
        console.log('✅ [ALINEACIONES] Respuesta completa:', response);
        
        let jugadoresArray: any[] = [];
        
        if (response && response.jugadores && Array.isArray(response.jugadores)) {
          jugadoresArray = response.jugadores;
        } else if (Array.isArray(response)) {
          jugadoresArray = response;
        } else if (response && response.items && Array.isArray(response.items)) {
          jugadoresArray = response.items;
        } else if (response && typeof response === 'object') {
          const keys = Object.keys(response);
          for (const key of keys) {
            if (Array.isArray(response[key]) && response[key].length > 0) {
              jugadoresArray = response[key];
              break;
            }
          }
        }
        
        console.log(`📊 [ALINEACIONES] Jugadores extraídos:`, jugadoresArray);
        
        const jugadores: JugadorParaAlineacion[] = jugadoresArray
          .filter((j: any) => j.activo === true || j.activo === 1 || j.activo === '1' || j.activo === 'true')
          .map((j: any) => ({
            id_jugador: j.id_jugador,
            nombre: j.nombre || '',
            apellido: j.apellido || '',
            documento: j.documento || '',
            dorsal: j.dorsal || 0,
            posicion: j.posicion || 'Mediocampista',
            activo: true,
            seleccionado: false,
            esTitular: false,
            posicion_x: undefined,
            posicion_y: undefined
          }));
        
        console.log(`✅ [ALINEACIONES] ${jugadores.length} jugadores activos procesados`);
        
        if (jugadores.length === 0) {
          this.mostrarToast('warning', 'Sin jugadores activos', 'No tienes jugadores activos en este equipo.');
          this.loading.set(false);
          return;
        }
        
        this.jugadoresDisponibles.set(jugadores);
        this.jugadoresSinAsignar.set([...jugadores]);
        
        this.cargarAlineacionExistente(idPartido, idEquipo);
      },
      error: (error: any) => {
        console.error('❌ [ALINEACIONES] Error al cargar jugadores:', error);
        this.mostrarToast('error', 'Error al cargar jugadores', 
          error.error?.error || error.message || 'No se pudieron cargar los jugadores');
        this.loading.set(false);
      }
    });
  }

  cargarAlineacionExistente(idPartido: number, idEquipo: number): void {
    this.liderService.obtenerAlineacion(idPartido, idEquipo).subscribe({
      next: (response: any) => {
        const alineaciones = response.alineaciones || [];

        if (alineaciones.length === 0) {
          this.loading.set(false);
          return;
        }

        if (alineaciones[0].formacion) {
          this.formacionActual.set(alineaciones[0].formacion);
        }

        const jugadores = [...this.jugadoresDisponibles()];
        const nuevosTitulares: JugadorParaAlineacion[] = [];
        const nuevosSuplentes: JugadorParaAlineacion[] = [];
        const sinAsignar: JugadorParaAlineacion[] = [];

        alineaciones.forEach((a: any) => {
          const jugador = jugadores.find(j => j.id_jugador === a.id_jugador);
          if (jugador) {
            jugador.posicion_x = a.posicion_x;
            jugador.posicion_y = a.posicion_y;
            jugador.seleccionado = true;
            
            if (a.titular) {
              jugador.esTitular = true;
              nuevosTitulares.push(jugador);
            } else {
              nuevosSuplentes.push(jugador);
            }
          }
        });

        jugadores.forEach(j => {
          if (!j.seleccionado) {
            sinAsignar.push(j);
          }
        });

        this.titularesEnCancha.set(nuevosTitulares);
        this.suplentes.set(nuevosSuplentes);
        this.jugadoresSinAsignar.set(sinAsignar);

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onDrop(event: CdkDragDrop<JugadorParaAlineacion[]>, posicion?: { x: number, y: number, posicion: string }): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const jugador = event.previousContainer.data[event.previousIndex];

      if (posicion) {
        if (!this.validarPosicion(jugador, posicion.posicion)) {
          this.mostrarToast('error', 'Posición inválida', `${jugador.nombre} ${jugador.apellido} (${jugador.posicion}) no puede jugar como ${posicion.posicion}`);
          return;
        }

        const jugadorEnPosicion = this.titularesEnCancha().find(
          j => j.posicion_x === posicion.x && j.posicion_y === posicion.y
        );

        if (jugadorEnPosicion) {
          this.mostrarToast('warning', 'Posición ocupada', 'Ya hay un jugador en esa posición');
          return;
        }

        if (this.titularesEnCancha().length >= this.maxTitulares()) {
          this.mostrarToast('warning', 'Límite alcanzado', `Solo puedes tener ${this.maxTitulares()} titulares`);
          return;
        }

        jugador.posicion_x = posicion.x;
        jugador.posicion_y = posicion.y;
        jugador.esTitular = true;
        jugador.seleccionado = true;
      } else {
        if (event.container.id === 'suplentes-list' || event.container.id === 'disponibles-list') {
          jugador.posicion_x = undefined;
          jugador.posicion_y = undefined;
          jugador.esTitular = false;
        }
      }

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  validarPosicion(jugador: JugadorParaAlineacion, posicionCancha: string): boolean {
    const posicionJugador = jugador.posicion?.toLowerCase() || '';
    const posicionObjetivo = posicionCancha.toLowerCase();

    if (posicionObjetivo.includes('portero')) {
      return posicionJugador.includes('portero');
    }

    if (posicionJugador.includes('portero')) {
      return posicionObjetivo.includes('portero');
    }

    if (posicionObjetivo.includes('defensa')) {
      return posicionJugador.includes('defensa') || 
             posicionJugador.includes('lateral') ||
             posicionJugador.includes('central');
    }

    if (posicionObjetivo.includes('mediocampista') || posicionObjetivo.includes('medio')) {
      return posicionJugador.includes('medio') || 
             posicionJugador.includes('volante') ||
             posicionJugador.includes('mediocampista');
    }

    if (posicionObjetivo.includes('delantero') || posicionObjetivo.includes('atacante')) {
      return posicionJugador.includes('delantero') || 
             posicionJugador.includes('atacante') ||
             posicionJugador.includes('extremo') ||
             posicionJugador.includes('punta');
    }

    return true;
  }

  cambiarFormacion(formacion: string): void {
    if (this.titularesEnCancha().length > 0) {
      if (!confirm('⚠️ Cambiar formación eliminará la alineación actual. ¿Continuar?')) {
        return;
      }
      this.jugadoresSinAsignar.update(list => [
        ...list,
        ...this.titularesEnCancha().map(j => {
          j.posicion_x = undefined;
          j.posicion_y = undefined;
          j.esTitular = false;
          j.seleccionado = false;
          return j;
        })
      ]);
      this.titularesEnCancha.set([]);
    }
    this.formacionActual.set(formacion);
  }

  limpiarAlineacion(): void {
    this.jugadoresDisponibles().forEach(j => {
      j.seleccionado = false;
      j.esTitular = false;
      j.posicion_x = undefined;
      j.posicion_y = undefined;
    });
    this.titularesEnCancha.set([]);
    this.suplentes.set([]);
    this.jugadoresSinAsignar.set([...this.jugadoresDisponibles()]);
  }

  guardarAlineacion(): void {
    console.log('💾 [ALINEACIONES] Iniciando guardado...');
    
    const partido = this.partidoSeleccionado();
    const equipoActual = this.equipoSeleccionado();

    if (!partido) {
      this.mostrarToast('error', 'Error', 'No hay partido seleccionado');
      return;
    }

    if (!equipoActual) {
      this.mostrarToast('error', 'Error', 'No hay equipo seleccionado');
      return;
    }

    if (this.titularesEnCancha().length !== this.maxTitulares()) {
      this.mostrarToast('warning', 'Alineación incompleta', 
        `Debes seleccionar exactamente ${this.maxTitulares()} titulares. Tienes ${this.titularesEnCancha().length}`);
      return;
    }

    this.guardando.set(true);

    const data: any = {
      id_partido: partido.id_partido,
      id_equipo: equipoActual.id_equipo,
      formacion: this.formacionActual(),
      jugadores: [
        ...this.titularesEnCancha().map(j => ({
          id_jugador: j.id_jugador,
          titular: true,
          posicion_x: j.posicion_x ?? 0,
          posicion_y: j.posicion_y ?? 0
        })),
        ...this.suplentes().map(j => ({
          id_jugador: j.id_jugador,
          titular: false
        }))
      ]
    };

    console.log('📤 [ALINEACIONES] Datos a enviar:', JSON.stringify(data, null, 2));

    this.liderService.definirAlineacion(data).subscribe({
      next: (response: any) => {
        console.log('✅ [ALINEACIONES] Guardado exitoso:', response);
        
        if (response.penalizacion) {
          const penalizacion = response.penalizacion;
          this.mostrarToast(
            'warning',
            'Alineación guardada con penalización',
            `El partido se ha retrasado ${penalizacion.minutos} minutos`
          );
        } else {
          this.mostrarToast('success', '✅ Alineación guardada', 
            'Tu alineación está visible para el organizador');
        }
        
        this.guardando.set(false);
      },
      error: (error: any) => {
        console.error('❌ [ALINEACIONES] Error completo:', error);
        console.error('   Status:', error.status);
        console.error('   Error:', error.error);
        console.error('   Message:', error.message);
        
        const mensaje = error.error?.error || error.error?.mensaje || error.message || 'Error al guardar la alineación';
        this.mostrarToast('error', 'Error al guardar', mensaje);
        this.guardando.set(false);
      }
    });
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

  jugadorEnPosicion(x: number, y: number): boolean {
    return this.titularesEnCancha().some(j => j.posicion_x === x && j.posicion_y === y);
  }
  
  getDropZoneIds(): string[] {
    const ids = ['disponibles-list', 'suplentes-list'];
    for (let i = 0; i < this.posicionesCancha().length; i++) {
      ids.push(`drop-pos-${i}`);
    }
    return ids;
  }

  contarPorPosicion(tipo: string): number {
    return this.posicionesCancha().filter(p => p.posicion.includes(tipo)).length;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  formatearHora(fecha: string): string {
    return new Date(fecha).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}