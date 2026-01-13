// src/types/index.ts

export interface Campeonato {
  id: number;
  nombre: string;
  deporte_tipo: 'futbol' | 'indoor';
  tipo_competicion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'planificacion' | 'en_curso' | 'finalizado';
  logo?: string;
  descripcion?: string;
}

export interface Equipo {
  id: number;
  nombre: string;
  logo?: string;
  campeonato_id?: number;
}

export interface Jugador {
  id: number;
  nombre: string;
  apellido: string;
  numero?: number;
  posicion?: string;
  equipo_id: number;
  equipo?: Equipo;
}

export interface Partido {
  id: number;
  campeonato_id: number;
  equipo_local_id: number;
  equipo_visitante_id: number;
  equipo_local: Equipo;
  equipo_visitante: Equipo;
  fecha_hora: string;
  estado: 'programado' | 'en_juego' | 'finalizado' | 'cancelado';
  goles_local: number;
  goles_visitante: number;
  cancha?: string;
  arbitro?: string;
}

export interface TablaPosicion {
  equipo: Equipo;
  posicion: number;
  puntos: number;
  partidos_jugados: number;
  partidos_ganados: number;
  partidos_empatados: number;
  partidos_perdidos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
}

export interface Goleador {
  jugador: Jugador;
  goles: number;
  partidos_jugados: number;
}

export interface Tarjeta {
  jugador: Jugador;
  amarillas: number;
  rojas: number;
  partidos_jugados: number;
}

export interface ApiResponse<T> {
  data?: T;
  campeonatos?: T[];
  partidos?: T[];
  equipos?: T[];
  jugadores?: T[];
}