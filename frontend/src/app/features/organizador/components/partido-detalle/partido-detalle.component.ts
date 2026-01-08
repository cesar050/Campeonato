import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizadorService, Partido } from '../../services/organizador.service';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

interface EventoPartido {
  id_evento?: number;
  id_partido: number;
  id_equipo: number;
  id_jugador: number;
  tipo: 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja';
  minuto: number;
  id_asistidor?: number;
  jugador_nombre?: string;
  jugador_dorsal?: number;
  equipo_nombre?: string;
  fecha_registro?: string;
}

interface JugadorAlineacion {
  id_jugador: number;
  jugador_nombre: string;
  dorsal: number;
  posicion: string;
  titular: boolean;
  posicion_x?: number;
  posicion_y?: number;
  foto_url?: string;
}

interface AlineacionEquipo {
  formacion: string;
  titulares: JugadorAlineacion[];
  suplentes: JugadorAlineacion[];
  logo_url?: string;
  nombre: string;
}

interface EstadoJugador {
  goles: number;
  amarillas: number;
  rojas: number;
  expulsado: boolean;
}

@Component({
  selector: 'app-partido-detalle',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ToastComponent,
    ImagePlaceholderComponent
  ],
  templateUrl: './partido-detalle.component.html',
  styleUrls: ['./partido-detalle.component.scss']
})
export class PartidoDetalleComponent implements OnInit {
  // Estados principales
  loading = signal(false);
  loadingAlineaciones = signal(false);
  partido = signal<Partido | null>(null);
  eventos = signal<EventoPartido[]>([]);
  
  // Alineaciones
  alineacionLocal = signal<AlineacionEquipo | null>(null);
  alineacionVisitante = signal<AlineacionEquipo | null>(null);
  tieneAlineacionLocal = signal(false);
  tieneAlineacionVisitante = signal(false);
  
  // Cronómetro
  tiempoTranscurrido = signal(0);
  cronometroActivo = signal(false);
  intervalo: any = null;
  tiempoActual = signal<'primer_tiempo' | 'descanso' | 'segundo_tiempo' | 'finalizado'>('primer_tiempo');
  velocidadActual = signal<1 | 10 | 60>(60);
  
  // Registro de eventos
  jugadorSeleccionado = signal<JugadorAlineacion | null>(null);
  equipoSeleccionado = signal<'local' | 'visitante' | null>(null);
  estadoJugadores = signal<Record<number, EstadoJugador>>({});
  
  // Vista de alineaciones
  mostrarAlineaciones = signal(true);
  verAlineacionLocal = signal(true);
  verAlineacionVisitante = signal(true);
  
  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');
  
  idPartido = 0;

  // ==================== COMPUTEDS ====================
  
  tipoDeporte = computed(() => {
    const p = this.partido();
    if (!p) return 'futbol';
    
    // 🔥 CORRECCIÓN: Buscar en múltiples lugares
    console.log('🔍 Partido completo:', p);
    
    // Opción 1: En el objeto partido directamente
    if ((p as any).tipo_deporte) {
      console.log('✅ Tipo deporte encontrado en partido:', (p as any).tipo_deporte);
      return (p as any).tipo_deporte;
    }
    
    // Opción 2: En campeonato nested
    if ((p as any).campeonato?.tipo_deporte) {
      console.log('✅ Tipo deporte encontrado en campeonato:', (p as any).campeonato.tipo_deporte);
      return (p as any).campeonato.tipo_deporte;
    }
    
    console.log('⚠️ No se encontró tipo_deporte, usando futbol por defecto');
    return 'futbol';
  });

  esIndoor = computed(() => {
    const tipo = this.tipoDeporte();
    console.log('🏟️ Es Indoor?:', tipo === 'indoor');
    return tipo === 'indoor';
  });

  tiempoDuracion = computed(() => {
    const duracion = this.esIndoor() ? 40 : 90;
    console.log('⏱️ Duración total:', duracion, 'minutos');
    return duracion;
  });
  
  duracionPrimerTiempo = computed(() => this.tiempoDuracion() / 2);
  duracionSegundoTiempo = computed(() => this.tiempoDuracion() / 2);

  maxTitulares = computed(() => this.esIndoor() ? 6 : 11);
  maxSuplentes = computed(() => this.esIndoor() ? 6 : 7);

  tiempoFormateado = computed(() => {
    const segundos = this.tiempoTranscurrido();
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  });

  minutoActual = computed(() => Math.floor(this.tiempoTranscurrido() / 60));

  minutoJuego = computed(() => {
    const tiempo = this.tiempoActual();
    const minutos = this.minutoActual();
    const mitad = this.duracionPrimerTiempo();
    
    if (tiempo === 'primer_tiempo') {
      return minutos;
    } else if (tiempo === 'segundo_tiempo') {
      return mitad + minutos;
    }
    return minutos;
  });

  golesLocal = computed(() => 
    this.eventos().filter(e => e.tipo === 'gol' && e.id_equipo === this.partido()?.id_equipo_local).length
  );

  golesVisitante = computed(() => 
    this.eventos().filter(e => e.tipo === 'gol' && e.id_equipo === this.partido()?.id_equipo_visitante).length
  );

  tarjetasAmarillasLocal = computed(() =>
    this.eventos().filter(e => e.tipo === 'tarjeta_amarilla' && e.id_equipo === this.partido()?.id_equipo_local).length
  );

  tarjetasAmarillasVisitante = computed(() =>
    this.eventos().filter(e => e.tipo === 'tarjeta_amarilla' && e.id_equipo === this.partido()?.id_equipo_visitante).length
  );

  tarjetasRojasLocal = computed(() =>
    this.eventos().filter(e => e.tipo === 'tarjeta_roja' && e.id_equipo === this.partido()?.id_equipo_local).length
  );

  tarjetasRojasVisitante = computed(() =>
    this.eventos().filter(e => e.tipo === 'tarjeta_roja' && e.id_equipo === this.partido()?.id_equipo_visitante).length
  );

  eventosOrdenados = computed(() => 
    [...this.eventos()].sort((a, b) => b.minuto - a.minuto)
  );

  puedeIniciarPartido = computed(() => {
    return this.tieneAlineacionLocal() && this.tieneAlineacionVisitante();
  });

  // 🔥 CORRECCIÓN: Nombres de equipos
  nombreEquipoLocal = computed(() => {
    const p = this.partido();
    const nombre = p?.equipo_local || this.alineacionLocal()?.nombre || 'Equipo Local';
    console.log('🏠 Equipo Local:', nombre);
    return nombre;
  });

  nombreEquipoVisitante = computed(() => {
    const p = this.partido();
    const nombre = p?.equipo_visitante || this.alineacionVisitante()?.nombre || 'Equipo Visitante';
    console.log('✈️ Equipo Visitante:', nombre);
    return nombre;
  });

  constructor(
    private organizadorService: OrganizadorService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.idPartido = +params['id'];
        this.cargarPartido();
        this.cargarAlineaciones();
        this.cargarEventos();
      }
    });
  }

  ngOnDestroy(): void {
    this.detenerCronometro();
  }

  // ==================== CARGA DE DATOS ====================

  cargarPartido(): void {
    this.loading.set(true);
    
    this.organizadorService.obtenerPartidoPorId(this.idPartido).subscribe({
      next: (response: any) => {
        console.log('📦 Respuesta completa del partido:', response);
        const partidoData = response.partido || response;
        console.log('⚽ Datos del partido procesados:', partidoData);
        this.partido.set(partidoData);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('❌ Error al cargar partido:', error);
        this.mostrarToast('error', 'Error', 'No se pudo cargar el partido');
        this.loading.set(false);
      }
    });
  }

  cargarAlineaciones(): void {
    this.loadingAlineaciones.set(true);
    
    this.organizadorService.obtenerAlineacionesPartido(this.idPartido).subscribe({
      next: (response: any) => {
        console.log('📋 Alineaciones recibidas:', response);
        
        this.tieneAlineacionLocal.set(response.tiene_alineacion_local || false);
        this.tieneAlineacionVisitante.set(response.tiene_alineacion_visitante || false);
        
        // Procesar alineación local
        if (response.alineacion_local && response.alineacion_local.length > 0) {
          const formacion = response.alineacion_local[0]?.formacion || (this.esIndoor() ? '1-2-2' : '4-4-2');
          const titulares = response.alineacion_local.filter((j: any) => j.titular);
          const suplentes = response.alineacion_local.filter((j: any) => !j.titular);
          
          this.alineacionLocal.set({
            formacion,
            titulares,
            suplentes,
            nombre: response.partido?.equipo_local || this.partido()?.equipo_local || 'Equipo Local',
            logo_url: response.partido?.logo_local
          });
          
          console.log('✅ Alineación local procesada:', this.alineacionLocal());
        }
        
        // Procesar alineación visitante
        if (response.alineacion_visitante && response.alineacion_visitante.length > 0) {
          const formacion = response.alineacion_visitante[0]?.formacion || (this.esIndoor() ? '1-2-2' : '4-4-2');
          const titulares = response.alineacion_visitante.filter((j: any) => j.titular);
          const suplentes = response.alineacion_visitante.filter((j: any) => !j.titular);
          
          this.alineacionVisitante.set({
            formacion,
            titulares,
            suplentes,
            nombre: response.partido?.equipo_visitante || this.partido()?.equipo_visitante || 'Equipo Visitante',
            logo_url: response.partido?.logo_visitante
          });
          
          console.log('✅ Alineación visitante procesada:', this.alineacionVisitante());
        }
        
        this.loadingAlineaciones.set(false);
      },
      error: (error: any) => {
        console.error('❌ Error al cargar alineaciones:', error);
        this.loadingAlineaciones.set(false);
      }
    });
  }

  cargarEventos(): void {
    this.organizadorService.obtenerEventosPartido(this.idPartido).subscribe({
      next: (response: any) => {
        const eventos = response.eventos || [];
        console.log('🎯 Eventos cargados:', eventos);
        this.eventos.set(eventos);
        this.calcularEstadoJugadores(eventos);
      },
      error: (error: any) => {
        console.error('❌ Error al cargar eventos:', error);
      }
    });
  }

  calcularEstadoJugadores(eventos: EventoPartido[]): void {
    const estado: Record<number, EstadoJugador> = {};
    
    eventos.forEach(evento => {
      if (!estado[evento.id_jugador]) {
        estado[evento.id_jugador] = {
          goles: 0,
          amarillas: 0,
          rojas: 0,
          expulsado: false
        };
      }
      
      if (evento.tipo === 'gol') {
        estado[evento.id_jugador].goles++;
      } else if (evento.tipo === 'tarjeta_amarilla') {
        estado[evento.id_jugador].amarillas++;
        if (estado[evento.id_jugador].amarillas >= 2) {
          estado[evento.id_jugador].expulsado = true;
        }
      } else if (evento.tipo === 'tarjeta_roja') {
        estado[evento.id_jugador].rojas++;
        estado[evento.id_jugador].expulsado = true;
      }
    });
    
    this.estadoJugadores.set(estado);
  }

  // ==================== REGISTRO DE EVENTOS ====================

  seleccionarJugador(jugador: JugadorAlineacion, equipo: 'local' | 'visitante'): void {
    if (this.partido()?.estado !== 'en_juego') {
      this.mostrarToast('info', 'Partido no en juego', 'Solo se pueden registrar eventos cuando el partido está en juego');
      return;
    }

    const estado = this.estadoJugadores()[jugador.id_jugador];
    if (estado?.expulsado) {
      this.mostrarToast('warning', 'Jugador expulsado', 'No se pueden registrar eventos para jugadores expulsados');
      return;
    }

    const actual = this.jugadorSeleccionado();
    if (actual && actual.id_jugador === jugador.id_jugador) {
      this.jugadorSeleccionado.set(null);
      this.equipoSeleccionado.set(null);
    } else {
      this.jugadorSeleccionado.set(jugador);
      this.equipoSeleccionado.set(equipo);
    }
  }

  registrarEvento(tipo: 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja'): void {
    const jugador = this.jugadorSeleccionado();
    const partido = this.partido();
    const equipo = this.equipoSeleccionado();
    
    if (!jugador || !partido || !equipo) return;

    const payload = {
      tipo,
      id_equipo: equipo === 'local' ? partido.id_equipo_local : partido.id_equipo_visitante,
      id_jugador: jugador.id_jugador,
      minuto: this.minutoJuego()
    };

    this.organizadorService.registrarEvento(this.idPartido, payload).subscribe({
      next: () => {
        this.mostrarToast('success', 'Evento registrado', `${this.getTipoEventoTexto(tipo)} registrado correctamente`);
        this.cargarEventos();
        this.cargarPartido();
        this.jugadorSeleccionado.set(null);
        this.equipoSeleccionado.set(null);
      },
      error: (err: any) => {
        console.error('❌ Error registrando evento:', err);
        const msg = err.error?.error || err.message || 'Error al registrar evento';
        this.mostrarToast('error', 'Error', msg);
      }
    });
  }

  getTipoEventoTexto(tipo: string): string {
    const textos: Record<string, string> = {
      'gol': '⚽ Gol',
      'tarjeta_amarilla': '🟨 Tarjeta amarilla',
      'tarjeta_roja': '🟥 Tarjeta roja'
    };
    return textos[tipo] || tipo;
  }

  // ==================== CRONÓMETRO ====================

  iniciarCronometro(): void {
    if (this.cronometroActivo()) return;
    
    this.cronometroActivo.set(true);
    const incremento = this.velocidadActual();
    
    this.intervalo = setInterval(() => {
      this.tiempoTranscurrido.update(t => t + incremento);
      
      const mitad = this.duracionPrimerTiempo() * 60;
      const tiempoActualSeg = this.tiempoTranscurrido();
      
      if (this.tiempoActual() === 'primer_tiempo' && tiempoActualSeg >= mitad) {
        this.pausarCronometro();
        this.tiempoActual.set('descanso');
        this.mostrarToast('warning', '⏸️ Descanso', 'Primer tiempo finalizado');
      }
      
      if (this.tiempoActual() === 'segundo_tiempo' && tiempoActualSeg >= mitad) {
        this.pausarCronometro();
        this.tiempoActual.set('finalizado');
        this.mostrarToast('info', '⏱️ Tiempo cumplido', 'Tiempo reglamentario finalizado');
      }
    }, 1000);
  }

  pausarCronometro(): void {
    this.cronometroActivo.set(false);
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
  }

  detenerCronometro(): void {
    this.pausarCronometro();
  }

  reiniciarCronometro(): void {
    this.detenerCronometro();
    this.tiempoTranscurrido.set(0);
    this.tiempoActual.set('primer_tiempo');
  }

  iniciarSegundoTiempo(): void {
    this.tiempoTranscurrido.set(0);
    this.tiempoActual.set('segundo_tiempo');
    this.mostrarToast('success', '▶️ Segundo tiempo', 'Comienza el segundo tiempo');
    this.iniciarCronometro();
  }

  agregarTiempoAdicional(): void {
    const minutosAdicionales = 5 * 60;
    this.tiempoTranscurrido.update(t => t + minutosAdicionales);
    this.mostrarToast('info', '⏱️ Tiempo adicional', '+5 minutos agregados');
  }

  cambiarVelocidad(velocidad: 1 | 10 | 60): void {
    const estabaActivo = this.cronometroActivo();
    
    if (estabaActivo) {
      this.pausarCronometro();
    }
    
    this.velocidadActual.set(velocidad);
    
    if (estabaActivo) {
      this.iniciarCronometro();
    }
    
    const mensajes = {
      1: '🐢 Velocidad normal (1x)',
      10: '🏃 Velocidad rápida (10x)',
      60: '⚡ Velocidad prueba (60x)'
    };
    
    this.mostrarToast('info', 'Velocidad cambiada', mensajes[velocidad]);
  }

  getVelocidadTexto(): string {
    const vel = this.velocidadActual();
    return vel === 1 ? 'Normal' : vel === 10 ? 'Rápido' : 'Prueba';
  }

  getTiempoReal(): string {
    const vel = this.velocidadActual();
    const duracion = this.duracionPrimerTiempo();
    const minutos = Math.floor(duracion / vel);
    const segundos = Math.round((duracion % vel) * 60 / vel);
    return minutos > 0 ? `${minutos}min ${segundos}s por tiempo` : `${segundos}s por tiempo`;
  }

  getTiempoTexto(): string {
    const tiempo = this.tiempoActual();
    if (tiempo === 'primer_tiempo') return '1er Tiempo';
    if (tiempo === 'descanso') return 'Descanso';
    if (tiempo === 'segundo_tiempo') return '2do Tiempo';
    return 'Finalizado';
  }

  // ==================== ESTADOS DEL PARTIDO ====================

  iniciarPartido(): void {
    if (!this.puedeIniciarPartido()) {
      this.mostrarToast('error', 'No se puede iniciar', 'Ambos equipos deben tener alineación');
      return;
    }

    if (!confirm('¿Iniciar el partido?')) return;
    
    this.organizadorService.cambiarEstadoPartido(this.idPartido, 'en_juego').subscribe({
      next: () => {
        this.mostrarToast('success', 'Partido iniciado', 'El partido ha comenzado');
        this.cargarPartido();
        this.tiempoActual.set('primer_tiempo');
        this.iniciarCronometro();
      },
      error: (error: any) => {
        console.error('❌ Error al iniciar partido:', error);
        this.mostrarToast('error', 'Error', 'No se pudo iniciar el partido');
      }
    });
  }

  finalizarPartido(): void {
    if (!confirm('¿Finalizar el partido con el marcador actual?')) return;
    
    this.detenerCronometro();
    
    const datos = {
      goles_local: this.golesLocal(),
      goles_visitante: this.golesVisitante()
    };
    
    this.organizadorService.finalizarPartido(this.idPartido, datos).subscribe({
      next: () => {
        this.mostrarToast('success', 'Partido finalizado', `Resultado: ${this.golesLocal()} - ${this.golesVisitante()}`);
        this.tiempoActual.set('finalizado');
        this.cargarPartido();
      },
      error: (error: any) => {
        console.error('❌ Error al finalizar partido:', error);
        this.mostrarToast('error', 'Error', 'No se pudo finalizar el partido');
      }
    });
  }

  // ==================== ALINEACIONES - UI ====================

  toggleAlineaciones(): void {
    this.mostrarAlineaciones.update(v => !v);
  }

  toggleVerAlineacionLocal(): void {
    this.verAlineacionLocal.update(v => !v);
  }

  toggleVerAlineacionVisitante(): void {
    this.verAlineacionVisitante.update(v => !v);
  }

  obtenerPosicionJugador(jugador: JugadorAlineacion, index: number): string {
    if (jugador.posicion_x !== undefined && jugador.posicion_y !== undefined) {
      return `left: ${jugador.posicion_x}%; top: ${jugador.posicion_y}%;`;
    }
    
    const formacion = this.esIndoor() ? '1-2-2' : '4-4-2';
    const posiciones = this.obtenerPosicionesFormacion(formacion);
    
    if (index < posiciones.length) {
      return `left: ${posiciones[index].x}%; top: ${posiciones[index].y}%;`;
    }
    
    return 'left: 50%; top: 50%;';
  }

  obtenerPosicionesFormacion(formacion: string): Array<{x: number, y: number}> {
    const formaciones: { [key: string]: Array<{x: number, y: number}> } = {
      '4-4-2': [
        {x: 50, y: 90}, {x: 15, y: 70}, {x: 35, y: 75}, {x: 65, y: 75}, {x: 85, y: 70},
        {x: 15, y: 50}, {x: 38, y: 50}, {x: 62, y: 50}, {x: 85, y: 50},
        {x: 35, y: 25}, {x: 65, y: 25}
      ],
      '4-3-3': [
        {x: 50, y: 90}, {x: 15, y: 70}, {x: 35, y: 75}, {x: 65, y: 75}, {x: 85, y: 70},
        {x: 30, y: 50}, {x: 50, y: 50}, {x: 70, y: 50},
        {x: 20, y: 20}, {x: 50, y: 15}, {x: 80, y: 20}
      ],
      '1-2-2': [
        {x: 50, y: 85}, {x: 30, y: 60}, {x: 70, y: 60},
        {x: 30, y: 30}, {x: 70, y: 30}, {x: 50, y: 40}
      ],
      '1-3-1': [
        {x: 50, y: 85}, {x: 25, y: 60}, {x: 50, y: 60}, {x: 75, y: 60},
        {x: 50, y: 20}
      ]
    };
    
    return formaciones[formacion] || formaciones[this.esIndoor() ? '1-2-2' : '4-4-2'];
  }

  // ==================== UTILIDADES ====================

  volver(): void {
    this.router.navigate(['/organizador/partidos']);
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

  getEstadoBadge(estado: string): { clase: string; texto: string } {
    const estados: { [key: string]: { clase: string; texto: string } } = {
      'programado': { clase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', texto: 'Programado' },
      'en_juego': { clase: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', texto: 'En Curso' },
      'finalizado': { clase: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', texto: 'Finalizado' },
      'cancelado': { clase: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', texto: 'Cancelado' }
    };
    return estados[estado] || { clase: 'bg-gray-100 text-gray-700', texto: estado };
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}