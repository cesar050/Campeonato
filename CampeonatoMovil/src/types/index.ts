// src/types/index.ts

export interface Campeonato {
    id: number;
    nombre: string;
    deporte_tipo: 'futbol' | 'indoor';
    tipo_competicion: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    logo?: string;
    descripcion?: string;
  }
  
  export interface Equipo {
    id: number;
    nombre: string;
    logo?: string;
  }
  
  export interface Partido {
    id: number;
    campeonato_id: number;
    equipo_local_id: number;
    equipo_visitante_id: number;
    equipo_local: Equipo;
    equipo_visitante: Equipo;
    fecha_hora: string;
    estado: string;
    goles_local: number;
    goles_visitante: number;
  }
  
  export interface TablaPosicion {
    equipo: Equipo;
    puntos: number;
    partidos_jugados: number;
    partidos_ganados: number;
    partidos_empatados: number;
    partidos_perdidos: number;
    goles_favor: number;
    goles_contra: number;
    diferencia_goles: number;
  }