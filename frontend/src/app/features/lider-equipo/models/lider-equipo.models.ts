// ============================================
// EQUIPO
// ============================================
export interface Equipo {
  id_equipo: number;
  nombre: string;
  logo_url?: string;
  estadio?: string;
  max_jugadores: number;
  tipo_deporte: 'futbol' | 'indoor';
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  total_jugadores: number;
  campeonatos?: InscripcionCampeonato[];
}

export interface InscripcionCampeonato {
  id_campeonato: number;
  nombre_campeonato: string;
  estado_inscripcion: 'pendiente' | 'aprobado' | 'rechazado';
  fecha_inscripcion: string;
}

// ============================================
// JUGADOR
// ============================================
export interface Jugador {
  id_jugador: number;
  nombre: string;
  apellido: string;
  documento: string;
  dorsal: number;
  posicion: string;
  formacion?: string;
  fecha_nacimiento?: string;
  documento_pdf?: string;
  activo: boolean;
  id_equipo?: number;
}

// ============================================
// PARTIDO
// ============================================
export interface Partido {
  id_partido: number;
  id_equipo_local: number;
  id_equipo_visitante: number;
  id_campeonato?: number;
  campeonato: string;
  equipo_local: string;
  equipo_visitante: string;
  fecha_partido: string;
  lugar?: string;
  jornada: number;
  estado: 'programado' | 'en_juego' | 'finalizado' | 'cancelado';
  goles_local: number;
  goles_visitante: number;
  es_local: boolean;
  tipo_deporte?: 'futbol' | 'indoor';
}

// ============================================
// ESTADÍSTICAS
// ============================================
export interface EstadisticasEquipo {
  equipo: string;
  partidos_jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
  puntos: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
}

// ============================================
// NOTIFICACIONES
// ============================================
export interface Notificacion {
  id_notificacion: number;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'warning' | 'success' | 'error' | 'solicitud_aprobada' | 'solicitud_rechazada' | 'alineacion_rival' | 'partido_proximo' | 'resultado_partido';
  leida: boolean;
  fecha_envio?: string;
  fecha?: string;
  id_campeonato?: number;
  id_partido?: number;
  id_equipo?: number;
  datos_adicionales?: any;
}

// ============================================
// CAMPEONATOS
// ============================================
export interface CampeonatoDisponible {
  id_campeonato: number;
  nombre: string;
  descripcion?: string;
  tipo_deporte: 'futbol' | 'indoor';
  tipo_competicion: 'liga' | 'eliminacion_directa' | 'mixto';
  fecha_inicio: string;
  fecha_fin: string;
  max_equipos: number;
  total_equipos_inscritos: number;
  inscripciones_abiertas: boolean;
  es_publico: boolean;
  codigo_inscripcion?: string;
}

export interface CampeonatoEquipo {
  id_campeonato: number;
  nombre_campeonato: string;
  estado_inscripcion: 'pendiente' | 'aprobado' | 'rechazado';
  fecha_inscripcion: string;
}

// ============================================
// ALINEACIONES
// ============================================
export interface Alineacion {
  id_alineacion: number;
  id_partido: number;
  id_equipo: number;
  id_jugador: number;
  titular: boolean;
  minuto_entrada: number | null;
  minuto_salida: number | null;
  fecha_creacion: string;
  posicion_x?: number;
  posicion_y?: number;
  formacion?: string;
  jugador_nombre?: string;
  dorsal?: number;
  posicion?: string;
  equipo_nombre?: string;
}

export interface AlineacionDefinir {
  id_partido: number;
  id_equipo: number;
  formacion?: string;
  titulares: { 
    nombre: string; 
    posicion_x?: number; 
    posicion_y?: number; 
  }[];
  suplentes: { 
    nombre: string; 
    posicion_x?: number; 
    posicion_y?: number; 
  }[];
}

export interface JugadorParaAlineacion extends Jugador {
  seleccionado?: boolean;
  esTitular?: boolean;
  posicion_x?: number;
  posicion_y?: number;
}

export interface FormacionConfig {
  nombre: string;
  codigo: string;
  posiciones: Array<{ x: number; y: number; posicion: string }>;
}

// ============================================
// PAGINACIÓN
// ============================================
export interface PaginationParams {
  page?: number;
  per_page?: number;
  buscar?: string;
  posicion?: string;
  activo?: boolean;
  estado?: string;
  ordenar_por?: string;
  orden?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items?: T[];
  jugadores?: T[];
  partidos?: T[];
  notificaciones?: T[];
  pagination: {
    page: number;
    per_page: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface NotificacionResponse {
  notificaciones: Notificacion[];
  total: number;
  no_leidas: number;
}
// ============================================
// ESTADÍSTICAS
// ============================================
export interface TablaPosiciones {
  id_equipo: number;
  nombre_equipo: string;
  partidos_jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
  puntos: number;
  posicion: number;
}

export interface Goleador {
  id_jugador: number;
  nombre: string;
  apellido: string;
  dorsal: number;
  equipo: string;
  goles: number;
  partidos_jugados: number;
  promedio: number;
}

export interface Asistidor {
  id_jugador: number;
  nombre: string;
  apellido: string;
  dorsal: number;
  equipo: string;
  asistencias: number;
  partidos_jugados: number;
  promedio: number;
}

export interface EstadisticasJugador {
  id_jugador: number;
  nombre: string;
  apellido: string;
  dorsal: number;
  posicion: string;
  partidos_jugados: number;
  goles: number;
  asistencias: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  minutos_jugados: number;
}

export interface CampeonatoGanado {
  id_campeonato: number;
  nombre_campeonato: string;
  tipo_deporte: string;
  tipo_competicion: string;
  fecha_inicio: string;
  fecha_fin: string;
  nombre_equipo: string;
  posicion_final: number;
  trofeo: string;
}

export interface EstadisticasEquipo {
  id_equipo: number;
  nombre_equipo: string;
  partidos_jugados: number;
  victorias: number;
  empates: number;
  derrotas: number;
  goles_favor: number;
  goles_contra: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  campeonatos_ganados: number;
}