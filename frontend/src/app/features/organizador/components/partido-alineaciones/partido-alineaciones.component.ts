import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizadorService } from '../../services/organizador.service';

interface JugadorAlineacion {
  id_jugador: number;
  nombre: string;
  apellido: string;
  dorsal: number;
  posicion: string;
  posicion_x: number;
  posicion_y: number;
  equipo: 'local' | 'visitante';
  goles?: number;
  tarjetas_amarillas?: number;
  tarjetas_rojas?: number;
  asistencias?: number;
}

interface Evento {
  id?: number;
  minuto: number;
  tipo: 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | 'sustitucion';
  equipo: 'local' | 'visitante';
  jugador: JugadorAlineacion;
  jugador_sale?: JugadorAlineacion;
  asistidor?: JugadorAlineacion;
}

@Component({
  selector: 'app-partido-alineaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partido-alineaciones.component.html',
  styleUrls: ['./partido-alineaciones.component.scss']
})
export class PartidoAlineacionesComponent implements OnInit {
  loading = signal(true);
  partido = signal<any>(null);
  
  alineacionLocal = signal<JugadorAlineacion[]>([]);
  alineacionVisitante = signal<JugadorAlineacion[]>([]);
  eventos = signal<Evento[]>([]);
  
  menuContextual = signal<{
    visible: boolean;
    jugador: JugadorAlineacion | null;
    x: number;
    y: number;
  }>({ visible: false, jugador: null, x: 0, y: 0 });

  modoSeleccion = signal<'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | 'asistidor' | 'sustitucion' | null>(null);
  jugadorPrincipal = signal<JugadorAlineacion | null>(null);
  jugadorSeleccionado = signal<JugadorAlineacion | null>(null);
  tipoEventoSeleccionado = signal<'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | null>(null);
  equipoSeleccionado = signal<'local' | 'visitante'>('local');
  minutoActual = signal(45);

  golesLocal = computed(() => 
    this.eventos().filter(e => e.tipo === 'gol' && e.equipo === 'local').length
  );

  golesVisitante = computed(() => 
    this.eventos().filter(e => e.tipo === 'gol' && e.equipo === 'visitante').length
  );

  eventosRecientes = computed(() => 
    [...this.eventos()].sort((a, b) => b.minuto - a.minuto).slice(0, 10)
  );

  eventosOrdenados = computed(() => 
    [...this.eventos()].sort((a, b) => b.minuto - a.minuto)
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private organizadorService: OrganizadorService
  ) {}

  ngOnInit(): void {
    this.route.parent?.params.subscribe(params => {
      if (params['id']) {
        this.cargarDatosPartido(+params['id']);
      }
    });
  }

  cargarDatosPartido(idPartido: number): void {
    this.loading.set(true);
    
    this.organizadorService.obtenerPartidoPorId(idPartido).subscribe({
      next: (response: any) => {
        this.partido.set(response.partido || response);
        this.cargarAlineaciones(idPartido);
        this.cargarEventos(idPartido);
      },
      error: (error: any) => {
        console.error('Error al cargar partido:', error);
        this.loading.set(false);
      }
    });
  }

  cargarAlineaciones(idPartido: number): void {
    // Llamar al backend que se conecta con el microservicio
    this.organizadorService.obtenerAlineacionesPartido(idPartido).subscribe({
      next: (response: any) => {
        console.log('✅ Alineaciones recibidas:', response);
        
        // Mapear alineaciones del backend
        const alineacionLocal = (response.alineacion_local || []).map((a: any) => {
          // Manejar nombre completo (puede venir como "nombre apellido" o separado)
          let nombre = '';
          let apellido = '';
          
          if (a.jugador_nombre) {
            const partes = a.jugador_nombre.split(' ');
            nombre = partes[0] || '';
            apellido = partes.slice(1).join(' ') || '';
          } else if (a.nombre) {
            nombre = a.nombre;
            apellido = a.apellido || '';
          }
          
          return {
            id_jugador: a.id_jugador,
            nombre: nombre || 'Jugador',
            apellido: apellido,
            dorsal: a.dorsal || 0,
            posicion: a.posicion || 'Desconocido',
            posicion_x: a.posicion_x || 50,
            posicion_y: a.posicion_y || 50,
            equipo: 'local' as const,
            goles: 0,
            tarjetas_amarillas: 0,
            tarjetas_rojas: 0,
            asistencias: 0
          };
        });

        const alineacionVisitante = (response.alineacion_visitante || []).map((a: any) => {
          // Manejar nombre completo (puede venir como "nombre apellido" o separado)
          let nombre = '';
          let apellido = '';
          
          if (a.jugador_nombre) {
            const partes = a.jugador_nombre.split(' ');
            nombre = partes[0] || '';
            apellido = partes.slice(1).join(' ') || '';
          } else if (a.nombre) {
            nombre = a.nombre;
            apellido = a.apellido || '';
          }
          
          return {
            id_jugador: a.id_jugador,
            nombre: nombre || 'Jugador',
            apellido: apellido,
            dorsal: a.dorsal || 0,
            posicion: a.posicion || 'Desconocido',
            posicion_x: a.posicion_x || 50,
            posicion_y: a.posicion_y || 50,
            equipo: 'visitante' as const,
            goles: 0,
            tarjetas_amarillas: 0,
            tarjetas_rojas: 0,
            asistencias: 0
          };
        });

        this.alineacionLocal.set(alineacionLocal);
        this.alineacionVisitante.set(alineacionVisitante);

        // Si no hay alineaciones, generar simuladas
        if (alineacionLocal.length === 0 && alineacionVisitante.length === 0) {
          console.log('⚠️ No hay alineaciones, generando simuladas...');
          this.generarAlineacionesSimuladas();
        }

        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('❌ Error al cargar alineaciones:', error);
        // Si falla, generar simuladas
        this.generarAlineacionesSimuladas();
        this.loading.set(false);
      }
    });
  }

  cargarEventos(idPartido: number): void {
    this.organizadorService.obtenerEventosPartido(idPartido).subscribe({
      next: (response: any) => {
        console.log('✅ Eventos cargados:', response);
        
        const eventos = response.eventos || [];
        
        // Mapear eventos del backend
        const eventosMapeados = eventos.map((e: any) => {
          // Buscar jugador en alineaciones
          const jugadorLocal = this.alineacionLocal().find(j => j.id_jugador === e.id_jugador);
          const jugadorVisitante = this.alineacionVisitante().find(j => j.id_jugador === e.id_jugador);
          const jugador = jugadorLocal || jugadorVisitante;

          const asistidor = e.id_asistidor 
            ? this.alineacionLocal().find(j => j.id_jugador === e.id_asistidor) || 
              this.alineacionVisitante().find(j => j.id_jugador === e.id_asistidor)
            : undefined;

          return {
            id: e.id_evento,
            minuto: e.minuto,
            tipo: e.tipo,
            equipo: e.id_equipo === this.partido()?.id_equipo_local ? 'local' as const : 'visitante' as const,
            jugador: jugador || {
              id_jugador: e.id_jugador,
              nombre: e.jugador_nombre || 'Desconocido',
              apellido: '',
              dorsal: e.jugador_dorsal || 0,
              posicion: 'Desconocido',
              posicion_x: 50,
              posicion_y: 50,
              equipo: e.id_equipo === this.partido()?.id_equipo_local ? 'local' as const : 'visitante' as const
            },
            asistidor
          } as Evento;
        });

        this.eventos.set(eventosMapeados);

        // Actualizar contadores en jugadores
        this.actualizarContadoresJugadores();
      },
      error: (error: any) => {
        console.error('❌ Error al cargar eventos:', error);
      }
    });
  }

  actualizarContadoresJugadores(): void {
    const eventos = this.eventos();
    
    // Actualizar locales
    const locales = this.alineacionLocal().map(j => {
      const goles = eventos.filter(e => e.jugador.id_jugador === j.id_jugador && e.tipo === 'gol').length;
      const amarillas = eventos.filter(e => e.jugador.id_jugador === j.id_jugador && e.tipo === 'tarjeta_amarilla').length;
      const rojas = eventos.filter(e => e.jugador.id_jugador === j.id_jugador && e.tipo === 'tarjeta_roja').length;
      const asistencias = eventos.filter(e => e.asistidor?.id_jugador === j.id_jugador).length;
      
      return { ...j, goles, tarjetas_amarillas: amarillas, tarjetas_rojas: rojas, asistencias };
    });

    // Actualizar visitantes
    const visitantes = this.alineacionVisitante().map(j => {
      const goles = eventos.filter(e => e.jugador.id_jugador === j.id_jugador && e.tipo === 'gol').length;
      const amarillas = eventos.filter(e => e.jugador.id_jugador === j.id_jugador && e.tipo === 'tarjeta_amarilla').length;
      const rojas = eventos.filter(e => e.jugador.id_jugador === j.id_jugador && e.tipo === 'tarjeta_roja').length;
      const asistencias = eventos.filter(e => e.asistidor?.id_jugador === j.id_jugador).length;
      
      return { ...j, goles, tarjetas_amarillas: amarillas, tarjetas_rojas: rojas, asistencias };
    });

    this.alineacionLocal.set(locales);
    this.alineacionVisitante.set(visitantes);
  }

  generarAlineacionesSimuladas(): void {
    const partido = this.partido();
    if (!partido) return;

    const esIndoor = partido.tipo_deporte === 'futbol_indoor';

    // FÚTBOL 11: Formación 4-4-2
    const posiciones11Local = [
      { x: 50, y: 8, pos: 'Portero' },
      { x: 15, y: 22, pos: 'Defensa' },
      { x: 35, y: 22, pos: 'Defensa' },
      { x: 65, y: 22, pos: 'Defensa' },
      { x: 85, y: 22, pos: 'Defensa' },
      { x: 15, y: 40, pos: 'Mediocampista' },
      { x: 35, y: 40, pos: 'Mediocampista' },
      { x: 65, y: 40, pos: 'Mediocampista' },
      { x: 85, y: 40, pos: 'Mediocampista' },
      { x: 35, y: 58, pos: 'Delantero' },
      { x: 65, y: 58, pos: 'Delantero' }
    ];

    const posiciones11Visitante = [
      { x: 50, y: 92, pos: 'Portero' },
      { x: 15, y: 78, pos: 'Defensa' },
      { x: 35, y: 78, pos: 'Defensa' },
      { x: 65, y: 78, pos: 'Defensa' },
      { x: 85, y: 78, pos: 'Defensa' },
      { x: 15, y: 60, pos: 'Mediocampista' },
      { x: 35, y: 60, pos: 'Mediocampista' },
      { x: 65, y: 60, pos: 'Mediocampista' },
      { x: 85, y: 60, pos: 'Mediocampista' },
      { x: 35, y: 42, pos: 'Delantero' },
      { x: 65, y: 42, pos: 'Delantero' }
    ];

    // INDOOR 6: Formación 1-2-2-1
    const posiciones6Local = [
      { x: 50, y: 8, pos: 'Portero' },
      { x: 30, y: 28, pos: 'Defensa' },
      { x: 70, y: 28, pos: 'Defensa' },
      { x: 30, y: 48, pos: 'Mediocampista' },
      { x: 70, y: 48, pos: 'Mediocampista' },
      { x: 50, y: 65, pos: 'Delantero' }
    ];

    const posiciones6Visitante = [
      { x: 50, y: 92, pos: 'Portero' },
      { x: 30, y: 72, pos: 'Defensa' },
      { x: 70, y: 72, pos: 'Defensa' },
      { x: 30, y: 52, pos: 'Mediocampista' },
      { x: 70, y: 52, pos: 'Mediocampista' },
      { x: 50, y: 35, pos: 'Delantero' }
    ];

    const posicionesLocal = esIndoor ? posiciones6Local : posiciones11Local;
    const posicionesVisitante = esIndoor ? posiciones6Visitante : posiciones11Visitante;

    const nombresLocal = esIndoor 
      ? ['B. Leno', 'K. Tete', 'J. Andersen', 'Sasa Lukic', 'Harry Wilson', 'R. Jiménez']
      : ['B. Leno', 'K. Tete', 'J. Andersen', 'Jorge Cuenca', 'Antonee Robinson', 
         'Sasa Lukic', 'Sander Berge', 'Harry Wilson', 'Emile Smith Rowe', 'Kevin', 'R. Jiménez'];

    const nombresVisitante = esIndoor
      ? ['John Victor', 'Neco Williams', 'Murillo', 'Douglas Luiz', 'Morgan Gibbs-White', 'Igor Jesus']
      : ['John Victor', 'Neco Williams', 'Murillo', 'Nikola Milenkovic', 'Nicolo Savona',
         'Douglas Luiz', 'Elliot Anderson', 'Morgan Gibbs-White', 'Omari Hutchinson', 'Callum Hudson-Odoi', 'Igor Jesus'];

    const jugadoresLocal: JugadorAlineacion[] = posicionesLocal.map((pos, i) => ({
      id_jugador: i + 1,
      nombre: nombresLocal[i],
      apellido: '',
      dorsal: i + 1,
      posicion: pos.pos,
      posicion_x: pos.x,
      posicion_y: pos.y,
      equipo: 'local',
      goles: 0,
      tarjetas_amarillas: 0,
      tarjetas_rojas: 0,
      asistencias: 0
    }));

    const jugadoresVisitante: JugadorAlineacion[] = posicionesVisitante.map((pos, i) => ({
      id_jugador: i + 100,
      nombre: nombresVisitante[i],
      apellido: '',
      dorsal: i + 1,
      posicion: pos.pos,
      posicion_x: pos.x,
      posicion_y: pos.y,
      equipo: 'visitante',
      goles: 0,
      tarjetas_amarillas: 0,
      tarjetas_rojas: 0,
      asistencias: 0
    }));

    this.alineacionLocal.set(jugadoresLocal);
    this.alineacionVisitante.set(jugadoresVisitante);
  }

  mostrarMenuContextual(event: MouseEvent | KeyboardEvent, jugador: JugadorAlineacion): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Si es un evento de teclado, usar la posición del elemento
    let x = 0;
    let y = 0;
    
    if (event instanceof MouseEvent) {
      x = event.clientX;
      y = event.clientY;
    } else if (event instanceof KeyboardEvent) {
      // Para eventos de teclado, obtener la posición del elemento que disparó el evento
      const target = event.target as HTMLElement;
      if (target) {
        const rect = target.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }
    
    this.menuContextual.set({
      visible: true,
      jugador,
      x,
      y
    });
  }

  cerrarMenuContextual(): void {
    this.menuContextual.set({ visible: false, jugador: null, x: 0, y: 0 });
  }

  registrarGol(jugador: JugadorAlineacion): void {
    if (confirm('¿Registrar asistidor?')) {
      this.modoSeleccion.set('asistidor');
      this.jugadorPrincipal.set(jugador);
      this.cerrarMenuContextual();
      return;
    }

    this.agregarEvento({
      minuto: this.minutoActual(),
      tipo: 'gol',
      equipo: jugador.equipo,
      jugador
    });

    jugador.goles = (jugador.goles || 0) + 1;
    this.cerrarMenuContextual();
  }

  registrarTarjetaAmarilla(jugador: JugadorAlineacion): void {
    this.agregarEvento({
      minuto: this.minutoActual(),
      tipo: 'tarjeta_amarilla',
      equipo: jugador.equipo,
      jugador
    });

    jugador.tarjetas_amarillas = (jugador.tarjetas_amarillas || 0) + 1;
    this.cerrarMenuContextual();
  }

  registrarTarjetaRoja(jugador: JugadorAlineacion): void {
    this.agregarEvento({
      minuto: this.minutoActual(),
      tipo: 'tarjeta_roja',
      equipo: jugador.equipo,
      jugador
    });

    jugador.tarjetas_rojas = (jugador.tarjetas_rojas || 0) + 1;
    this.cerrarMenuContextual();
  }

  onClickJugador(jugador: JugadorAlineacion): void {
    const modo = this.modoSeleccion();
    const principal = this.jugadorPrincipal();

    if (!modo || !principal) return;

    if (modo === 'asistidor') {
      if (jugador.equipo !== principal.equipo) {
        alert('El asistidor debe ser del mismo equipo');
        return;
      }

      this.agregarEvento({
        minuto: this.minutoActual(),
        tipo: 'gol',
        equipo: principal.equipo,
        jugador: principal,
        asistidor: jugador
      });

      principal.goles = (principal.goles || 0) + 1;
      jugador.asistencias = (jugador.asistencias || 0) + 1;
      
      this.modoSeleccion.set(null);
      this.jugadorPrincipal.set(null);
    }
  }

  cancelarSeleccion(): void {
    this.modoSeleccion.set(null);
    this.jugadorPrincipal.set(null);
  }

  agregarEvento(evento: Evento): void {
    // Primero agregar localmente
    this.eventos.update(eventos => [...eventos, evento]);

    // Preparar datos para el backend
    const eventoBackend = {
      tipo: evento.tipo,
      id_equipo: evento.equipo === 'local' 
        ? this.partido()?.id_equipo_local 
        : this.partido()?.id_equipo_visitante,
      id_jugador: evento.jugador.id_jugador,
      minuto: evento.minuto,
      id_asistidor: evento.asistidor?.id_jugador,
      datos_adicionales: null
    };

    // Enviar al backend
    const idPartido = this.partido()?.id_partido;
    if (idPartido && eventoBackend.id_equipo) {
      this.organizadorService.registrarEvento(idPartido, eventoBackend).subscribe({
        next: (response: any) => {
          console.log('✅ Evento registrado en backend:', response);
        },
        error: (error: any) => {
          console.error('❌ Error al registrar evento:', error);
          alert('Error al guardar el evento en el servidor');
        }
      });
    }
  }

  volver(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  getColorPosicion(posicion: string): string {
    if (posicion.includes('Portero')) return '#FFD700';
    if (posicion.includes('Defensa')) return '#1976D2';
    if (posicion.includes('Mediocampista')) return '#2E7D32';
    if (posicion.includes('Delantero')) return '#D32F2F';
    return '#666';
  }

  trackByJugadorId(index: number, jugador: JugadorAlineacion): number {
    return jugador.id_jugador;
  }

  trackByEventoId(index: number, evento: Evento): number {
    return evento.id || index;
  }

  // ============================================
  // NUEVOS MÉTODOS PARA PANEL DE CONTROL
  // ============================================

  abrirSelectorJugador(tipo: 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja'): void {
    this.tipoEventoSeleccionado.set(tipo);
    this.modoSeleccion.set(tipo);
    this.equipoSeleccionado.set('local');
    this.jugadorSeleccionado.set(null);
  }

  seleccionarJugadorParaEvento(jugador: JugadorAlineacion): void {
    if (this.modoSeleccion()) {
      this.jugadorSeleccionado.set(jugador);
      this.equipoSeleccionado.set(jugador.equipo);
    } else {
      // Si no hay modo seleccionado, mostrar menú contextual
      this.mostrarMenuContextual(new MouseEvent('click'), jugador);
    }
  }

  getJugadoresEquipoSeleccionado(): JugadorAlineacion[] {
    const equipo = this.equipoSeleccionado();
    return equipo === 'local' ? this.alineacionLocal() : this.alineacionVisitante();
  }

  confirmarEvento(jugador: JugadorAlineacion): void {
    const tipo = this.tipoEventoSeleccionado();
    
    if (!tipo) return;

    // Validar si el jugador tiene roja y está intentando agregar otra
    if (tipo === 'tarjeta_roja' && jugador.tarjetas_rojas && jugador.tarjetas_rojas > 0) {
      alert('⚠️ Este jugador ya tiene una tarjeta roja. No se puede agregar otra.');
      return;
    }

    // Si es gol, preguntar por asistidor
    if (tipo === 'gol') {
      const tieneAsistidor = confirm('¿Este gol tiene asistidor?');
      if (tieneAsistidor) {
        this.modoSeleccion.set('asistidor');
        this.jugadorPrincipal.set(jugador);
        this.jugadorSeleccionado.set(null);
        return;
      }
    }

    // Registrar el evento
    this.agregarEvento({
      minuto: this.minutoActual(),
      tipo,
      equipo: jugador.equipo,
      jugador
    });

    // Actualizar contadores
    if (tipo === 'gol') {
      jugador.goles = (jugador.goles || 0) + 1;
    } else if (tipo === 'tarjeta_amarilla') {
      jugador.tarjetas_amarillas = (jugador.tarjetas_amarillas || 0) + 1;
    } else if (tipo === 'tarjeta_roja') {
      jugador.tarjetas_rojas = (jugador.tarjetas_rojas || 0) + 1;
      // Mostrar advertencia de sanción
      alert(`⚠️ ${jugador.nombre} ${jugador.apellido} recibió tarjeta roja. No podrá jugar el siguiente partido.`);
    }

    // Limpiar selección
    this.modoSeleccion.set(null);
    this.tipoEventoSeleccionado.set(null);
    this.jugadorSeleccionado.set(null);
    this.jugadorPrincipal.set(null);
  }

  getTipoEventoTexto(tipo: string): string {
    const textos: { [key: string]: string } = {
      'gol': 'GOL',
      'tarjeta_amarilla': 'TARJETA AMARILLA',
      'tarjeta_roja': 'TARJETA ROJA',
      'sustitucion': 'SUSTITUCIÓN'
    };
    return textos[tipo] || tipo.toUpperCase();
  }
}