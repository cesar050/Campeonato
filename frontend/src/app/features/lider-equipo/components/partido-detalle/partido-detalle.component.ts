import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LiderEquipoService } from '../../services/lider-equipo.service';
import { OrganizadorService } from '../../../organizador/services/organizador.service';
import { Partido } from '../../models/lider-equipo.models';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

interface EventoPartido {
  id?: number;
  minuto: number;
  tipo: 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | 'sustitucion' | 'cambio';
  equipo: 'local' | 'visitante';
  jugador?: {
    id_jugador: number;
    nombre: string;
    apellido: string;
    dorsal: number;
  };
  asistidor?: {
    id_jugador: number;
    nombre: string;
    apellido: string;
    dorsal: number;
  };
  detalles?: string;
}

interface JugadorAlineacion {
  id_jugador: number;
  jugador_nombre?: string;
  nombre?: string;
  apellido?: string;
  dorsal: number;
  posicion: string;
  titular: boolean;
  posicion_x?: number;
  posicion_y?: number;
  minuto_entrada?: number;
  minuto_salida?: number;
}

interface AlineacionEquipo {
  formacion: string;
  titulares: JugadorAlineacion[];
  suplentes: JugadorAlineacion[];
  nombre: string;
}

@Component({
  selector: 'app-partido-detalle-lider',
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
export class PartidoDetalleLiderComponent implements OnInit, OnDestroy {
  // Estados
  loading = signal(false);
  loadingAlineaciones = signal(false);
  partido = signal<Partido | null>(null);
  eventos = signal<EventoPartido[]>([]);
  
  // Alineaciones
  alineacionMiEquipo = signal<AlineacionEquipo | null>(null);
  alineacionRival = signal<AlineacionEquipo | null>(null);
  tieneAlineacionMiEquipo = signal(false);
  tieneAlineacionRival = signal(false);

  // Selección y estado por jugador (tarjetas, expulsado)
  jugadorActivo = signal<JugadorAlineacion | null>(null);
  estadoJugadoresMap = signal<Record<number, { amarillas: number; rojas: number; expulsado: boolean }>>({});
  
  // Cambios de jugadores
  showModalCambio = signal(false);
  jugadorSale = signal<JugadorAlineacion | null>(null);
  jugadorEntra = signal<JugadorAlineacion | null>(null);
  minutoCambio = signal(0);
  
  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');
  
  idPartido = 0;
  idEquipo = 0;
  esLocal = false;
  equiposInscritos = signal<any[]>([]);

  // Computeds
  tipoDeporte = computed(() => {
    const partido = this.partido();
    return partido?.tipo_deporte || 'futbol';
  });

  esIndoor = computed(() => this.tipoDeporte() === 'indoor');

  eventosOrdenados = computed(() => 
    [...this.eventos()].sort((a, b) => b.minuto - a.minuto)
  );

  titularesDisponibles = computed(() => {
    const alineacion = this.alineacionMiEquipo();
    if (!alineacion) return [];
    return alineacion.titulares.filter(j => !j.minuto_salida);
  });

  suplentesDisponibles = computed(() => {
    const alineacion = this.alineacionMiEquipo();
    if (!alineacion) return [];
    return alineacion.suplentes.filter(j => !j.minuto_entrada);
  });

  constructor(
    private liderService: LiderEquipoService,
    private router: Router,
    private route: ActivatedRoute,
    private organizadorService: OrganizadorService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.idPartido = +params['id'];
        this.cargarPartido();
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }

  cargarPartido(): void {
    this.loading.set(true);
    
    this.liderService.obtenerPartidoPorId(this.idPartido).subscribe({
      next: (response: any) => {
        const partidoData = response.partido || response;
        this.partido.set(partidoData);
        
        // Determinar si es local o visitante
        this.esLocal = partidoData.es_local || false;
        this.idEquipo = this.esLocal ? partidoData.id_equipo_local : partidoData.id_equipo_visitante;
        
        // Cargar equipos inscritos para obtener logos
        if (partidoData.id_campeonato) {
          this.cargarEquiposInscritos(partidoData.id_campeonato);
        }
        
        this.cargarAlineaciones();
        this.cargarEventos();
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error al cargar partido:', error);
        this.mostrarToast('error', 'Error', 'No se pudo cargar el partido');
        this.loading.set(false);
      }
    });
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

  cargarAlineaciones(): void {
    this.loadingAlineaciones.set(true);
    
    this.liderService.obtenerAlineacion(this.idPartido, this.idEquipo).subscribe({
      next: (response: any) => {
        const alineaciones = response.alineaciones || [];
        
        if (alineaciones.length > 0) {
          const formacion = alineaciones[0]?.formacion || (this.esIndoor() ? '1-2-2' : '4-4-2');
          const titulares = alineaciones.filter((j: any) => j.titular);
          const suplentes = alineaciones.filter((j: any) => !j.titular);
          
          this.alineacionMiEquipo.set({
            formacion,
            titulares,
            suplentes,
            nombre: this.partido()?.equipo_local || 'Mi Equipo'
          });
          this.tieneAlineacionMiEquipo.set(true);
          // Inicializar estadoJugadoresMap con 0 tarjetas
          const map: Record<number, { amarillas: number; rojas: number; expulsado: boolean }> = {};
          titulares.concat(suplentes).forEach((j: any) => {
            map[j.id_jugador] = { amarillas: j.tarjetas_amarillas || 0, rojas: j.tarjetas_rojas || 0, expulsado: !!(j.tarjetas_rojas && j.tarjetas_rojas > 0) };
          });
          this.estadoJugadoresMap.set(map);
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
    this.liderService.obtenerEventosPartido(this.idPartido).subscribe({
      next: (response: any) => {
        const eventos = response.eventos || [];
        
        const eventosMapeados: EventoPartido[] = eventos.map((e: any) => {
          return {
            id: e.id_evento,
            minuto: e.minuto,
            tipo: e.tipo,
            equipo: e.id_equipo === this.partido()?.id_equipo_local ? 'local' : 'visitante',
            jugador: e.jugador_nombre ? {
              id_jugador: e.id_jugador,
              nombre: e.jugador_nombre.split(' ')[0] || '',
              apellido: e.jugador_nombre.split(' ').slice(1).join(' ') || '',
              dorsal: e.jugador_dorsal || 0
            } : undefined,
            asistidor: e.asistidor_nombre ? {
              id_jugador: e.id_asistidor,
              nombre: e.asistidor_nombre.split(' ')[0] || '',
              apellido: e.asistidor_nombre.split(' ').slice(1).join(' ') || '',
              dorsal: e.asistidor_dorsal || 0
            } : undefined
          };
        });
        
        this.eventos.set(eventosMapeados);
        // Actualizar conteo de tarjetas y expulsiones por jugador (cliente)
        const map = { ...(this.estadoJugadoresMap() || {}) };
        eventos.forEach((e: any) => {
          if (!e.id_jugador) return;
          if (!map[e.id_jugador]) map[e.id_jugador] = { amarillas: 0, rojas: 0, expulsado: false };
          if (e.tipo === 'tarjeta_amarilla') map[e.id_jugador].amarillas += 1;
          if (e.tipo === 'tarjeta_roja') map[e.id_jugador].rojas += 1;
          if (map[e.id_jugador].rojas > 0 || map[e.id_jugador].amarillas >= 2) {
            map[e.id_jugador].expulsado = true;
          }
        });
        this.estadoJugadoresMap.set(map);
      },
      error: (error: any) => {
        console.error('❌ Error al cargar eventos:', error);
      }
    });
  }

  // Selección de jugador desde la cancha (cumple requisito de no escribir nombre manualmente)
  seleccionarJugador(jugador: JugadorAlineacion): void {
    if (this.estadoJugadoresMap()[jugador.id_jugador]?.expulsado) {
      this.mostrarToast('warning', 'Jugador expulsado', 'No se puede seleccionar un jugador expulsado');
      return;
    }

    // Solo permitir selección si partido está en juego
    if (this.partido() && this.partido()!.estado !== 'en_juego') {
      this.mostrarToast('info', 'Partido no en juego', 'Solo se pueden registrar eventos cuando el partido está en juego');
      return;
    }

    // Alternar selección
    const activo = this.jugadorActivo();
    if (activo && activo.id_jugador === jugador.id_jugador) {
      this.jugadorActivo.set(null);
    } else {
      this.jugadorActivo.set(jugador);
    }
  }

  // Obtener minuto actual (usamos la implementación más abajo)

  // Registrar evento (gol, amarilla, roja). Usa OrganizadorService.registrarEvento
  registrarEventoParaJugador(tipo: 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja'): void {
    const jugador = this.jugadorActivo();
    const partido = this.partido();
    if (!jugador || !partido) return;

    const payload: { tipo: 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | 'sustitucion'; id_equipo: number; id_jugador: number; minuto: number } = {
      tipo,
      id_equipo: partido.id_equipo_local === this.idEquipo ? partido.id_equipo_local : partido.id_equipo_visitante,
      id_jugador: jugador.id_jugador,
      minuto: this.obtenerMinutoActual()
    };

    this.organizadorService.registrarEvento(this.idPartido, payload).subscribe({
      next: (res: any) => {
        this.mostrarToast('success', 'Evento registrado', 'Evento registrado correctamente');
        // Actualizar eventos y estado jugadores
        this.cargarEventos();
        // Si es gol, actualizar marcador local/visitante
        if (res && res.marcador) {
          const p = this.partido() || {} as any;
          p.goles_local = res.marcador.local;
          p.goles_visitante = res.marcador.visitante;
          this.partido.set(p);
        } else {
          // recargar partido para consistencia
          this.cargarPartido();
        }

        // Si fue amarilla y ahora tiene 2 amarillas -> registrar roja automática
        if (tipo === 'tarjeta_amarilla') {
          const estado = this.estadoJugadoresMap()[jugador.id_jugador] || { amarillas: 0, rojas: 0, expulsado: false };
          const nuevasAmarillas = estado.amarillas + 1;
            if (nuevasAmarillas >= 2) {
              // Registrar roja automática en el servidor
              const payloadRoja: { tipo: 'tarjeta_roja'; id_equipo: number; id_jugador: number; minuto: number } = { tipo: 'tarjeta_roja', id_equipo: payload.id_equipo, id_jugador: jugador.id_jugador, minuto: payload.minuto };
              this.organizadorService.registrarEvento(this.idPartido, payloadRoja).subscribe({
              next: () => {
                this.mostrarToast('warning', 'Expulsión', 'Jugador expulsado por doble amarilla');
                this.cargarEventos();
                this.jugadorActivo.set(null);
              },
              error: (e) => {
                console.error('Error registrando roja automática:', e);
              }
            });
          }
        }

        // Si fue roja, marcar expulsado localmente
        if (tipo === 'tarjeta_roja') {
          const map = { ...(this.estadoJugadoresMap() || {}) };
          if (!map[jugador.id_jugador]) map[jugador.id_jugador] = { amarillas: 0, rojas: 0, expulsado: false };
          map[jugador.id_jugador].rojas += 1;
          map[jugador.id_jugador].expulsado = true;
          this.estadoJugadoresMap.set(map);
          this.jugadorActivo.set(null);
        }
      },
      error: (err: any) => {
        console.error('Error registrando evento:', err);
        const msg = err.error?.error || err.message || 'Error al registrar evento';
        this.mostrarToast('error', 'Error', msg);
      }
    });
  }

  abrirModalCambio(jugador: JugadorAlineacion): void {
    if (!jugador.titular) {
      this.mostrarToast('warning', 'Error', 'Solo puedes cambiar titulares');
      return;
    }
    
    if (jugador.minuto_salida) {
      this.mostrarToast('warning', 'Error', 'Este jugador ya fue sustituido');
      return;
    }
    
    this.jugadorSale.set(jugador);
    this.minutoCambio.set(this.obtenerMinutoActual());
    this.showModalCambio.set(true);
  }

  cerrarModalCambio(): void {
    this.showModalCambio.set(false);
    this.jugadorSale.set(null);
    this.jugadorEntra.set(null);
    this.minutoCambio.set(0);
  }

  seleccionarJugadorEntra(jugador: JugadorAlineacion): void {
    if (jugador.minuto_entrada) {
      this.mostrarToast('warning', 'Error', 'Este jugador ya está en cancha');
      return;
    }
    
    this.jugadorEntra.set(jugador);
  }

  confirmarCambio(): void {
    const jugadorSale = this.jugadorSale();
    const jugadorEntra = this.jugadorEntra();
    const minuto = this.minutoCambio();
    
    if (!jugadorSale || !jugadorEntra) {
      this.mostrarToast('error', 'Error', 'Debes seleccionar ambos jugadores');
      return;
    }
    
    if (minuto <= 0) {
      this.mostrarToast('error', 'Error', 'Debes ingresar un minuto válido');
      return;
    }
    
    this.liderService.hacerCambio({
      id_partido: this.idPartido,
      id_equipo: this.idEquipo,
      id_jugador_sale: jugadorSale.id_jugador,
      id_jugador_entra: jugadorEntra.id_jugador,
      minuto: minuto
    }).subscribe({
      next: (response: any) => {
        this.mostrarToast('success', 'Cambio realizado', 
          `${jugadorSale.nombre || jugadorSale.jugador_nombre} sale, ${jugadorEntra.nombre || jugadorEntra.jugador_nombre} entra`);
        this.cerrarModalCambio();
        this.cargarAlineaciones();
        this.cargarEventos();
      },
      error: (error: any) => {
        console.error('Error al hacer cambio:', error);
        const mensaje = error.error?.error || error.message || 'Error al realizar el cambio';
        this.mostrarToast('error', 'Error', mensaje);
      }
    });
  }

  obtenerMinutoActual(): number {
    // Por ahora retornamos 0, pero se puede calcular basado en el tiempo transcurrido del partido
    return 0;
  }

  getTipoEventoTexto(tipo: string): string {
    const tipos: any = {
      'gol': '⚽ Gol',
      'tarjeta_amarilla': '🟨 Tarjeta Amarilla',
      'tarjeta_roja': '🟥 Tarjeta Roja',
      'sustitucion': '🔄 Sustitución',
      'cambio': '🔄 Cambio'
    };
    return tipos[tipo] || tipo;
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatearHora(fecha: string): string {
    return new Date(fecha).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
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

  volver(): void {
    this.router.navigate(['/lider-equipo/partidos']);
  }
}

