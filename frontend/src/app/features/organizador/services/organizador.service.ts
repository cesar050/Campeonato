import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// ============================================
// INTERFACES
// ============================================

export interface Campeonato {
  id_campeonato: number;
  nombre: string;
  descripcion?: string;
  max_equipos: number;
  tipo_deporte: 'futbol' | 'indoor';
  tipo_competicion: 'liga' | 'eliminacion_directa' | 'mixto';
  fecha_inicio: string;
  fecha_fin: string;
  fecha_inicio_inscripciones?: string;
  fecha_cierre_inscripciones?: string;
  inscripciones_abiertas: boolean;
  estado: 'planificacion' | 'en_curso' | 'finalizado';
  partidos_generados: boolean;
  creado_por: number;
  nombre_creador?: string;
  total_equipos_inscritos?: number;
  total_equipos_pendientes?: number;
  codigo_inscripcion?: string;
  es_publico?: boolean;
}

export interface Equipo {
  id_equipo: number;
  nombre: string;
  logo_url?: string;
  estadio?: string;
  max_jugadores: number;
  tipo_deporte: 'futbol' | 'indoor';
  estado: string;
  fecha_registro: string;
  fecha_aprobacion?: string;
  observaciones?: string;
  total_jugadores?: number;
  nombre_lider?: string;
  email_lider?: string;
  telefono_lider?: string;
  campeonatos?: any[];

  lider?: {
    id_usuario: number;
    nombre: string;
    email: string;
    telefono?: string;
  };
}

export interface Inscripcion {
  id: number;
  id_campeonato: number;
  id_equipo: number;
  fecha_inscripcion: string;
  estado_inscripcion: 'pendiente' | 'aprobado' | 'rechazado';
  observaciones?: string;
  nombre_grupo?: string;
  numero_sorteo?: number;
  equipo?: Equipo;
}

export interface Partido {
  id_partido: number;
  id_campeonato: number;
  jornada: number;
  id_equipo_local: number;
  id_equipo_visitante: number;
  equipo_local: string;
  equipo_visitante: string;
  equipo_local_nombre?: string;
  equipo_visitante_nombre?: string;
  campeonato?: string;
  fecha_partido: string;
  hora_partido?: string;
  lugar?: string;
  documento_url?: string;
  estado: 'programado' | 'en_juego' | 'finalizado' | 'cancelado';
  goles_local: number;
  goles_visitante: number;
  tipo_deporte?: string;
}

export interface Jugador {
  id_jugador: number;
  id_equipo: number;
  nombre: string;
  apellido: string;
  documento: string;
  dorsal: number;
  posicion: 'portero' | 'defensa' | 'mediocampista' | 'delantero';
  fecha_nacimiento?: string;
  activo: boolean;
  equipo?: string;
  documento_pdf_url?: string;
  documento_url?: string;
  estado_validacion?: 'pendiente' | 'aprobado' | 'rechazado';
  observaciones_validacion?: string;
  fecha_validacion?: string;
}

export interface EstadisticasValidacion {
  total_jugadores: number;
  jugadores_aprobados: number;
  jugadores_rechazados: number;
  jugadores_pendientes: number;
  porcentaje_validado: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizadorService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // ============================================
  // CAMPEONATOS
  // ============================================

  obtenerCampeonatoPorId(id: number): Observable<{ campeonato: Campeonato }> {
    return this.http.get<{ campeonato: Campeonato }>(`${this.apiUrl}/campeonatos/${id}`);
  }

  obtenerMisCampeonatos(): Observable<Campeonato[]> {
    return this.http.get<any>(`${this.apiUrl}/campeonatos/mis-campeonatos`).pipe(
      map((response: any) => {
        if (response.campeonatos && Array.isArray(response.campeonatos)) {
          return response.campeonatos;
        }
        if (Array.isArray(response)) {
          return response;
        }
        if (response.campeonato) {
          return [response.campeonato];
        }
        return [];
      })
    );
  }

  crearCampeonato(datos: any): Observable<{ campeonato: Campeonato }> {
    return this.http.post<{ campeonato: Campeonato }>(`${this.apiUrl}/campeonatos`, datos);
  }

  actualizarCampeonato(id: number, datos: any): Observable<{ campeonato: Campeonato }> {
    return this.http.put<{ campeonato: Campeonato }>(`${this.apiUrl}/campeonatos/${id}`, datos);
  }

  cambiarEstadoCampeonato(id: number, estado: string, observaciones?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/campeonatos/${id}/estado`, { estado, observaciones });
  }

  generarPartidos(idCampeonato: number, datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/campeonatos/${idCampeonato}/generar-partidos`, datos);
  }

  sortearGrupos(idCampeonato: number, numeroGrupos: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/campeonatos/${idCampeonato}/sorteo-grupos`, {
      numero_grupos: numeroGrupos
    });
  }

  // ============================================
  // INSCRIPCIONES
  // ============================================

  obtenerInscripciones(filtros?: any): Observable<{ inscripciones: Inscripcion[] }> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params = params.set(key, filtros[key]);
      });
    }
    return this.http.get<{ inscripciones: Inscripcion[] }>(`${this.apiUrl}/inscripciones`, { params });
  }

  obtenerInscripcionesPorCampeonato(idCampeonato: number, estado?: string): Observable<any> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.http.get(`${this.apiUrl}/campeonatos/${idCampeonato}/inscripciones`, { params });
  }

  obtenerInscripcionesConPaginacion(
    idCampeonato: number,
    pagina: number = 1,
    limite: number = 5,
    ordenarPor: 'fecha_asc' | 'fecha_desc' = 'fecha_desc',
    estado?: string,
    fecha?: string
  ): Observable<{ inscripciones: Inscripcion[], total: number, paginas: number, pagina_actual: number }> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('limite', limite.toString())
      .set('orden', ordenarPor === 'fecha_desc' ? 'desc' : 'asc');

    if (estado) {
      params = params.set('estado', estado);
    }

    if (fecha) {
      params = params.set('fecha', fecha);
    }

    return this.http.get<any>(
      `${this.apiUrl}/campeonatos/${idCampeonato}/inscripciones/paginado`,
      { params }
    ).pipe(
      map((response: any) => ({
        inscripciones: response.inscripciones || [],
        total: response.total || 0,
        paginas: response.total_paginas || 0,
        pagina_actual: response.pagina_actual || 1
      }))
    );
  }

  cambiarEstadoInscripcion(idInscripcion: number, estado: string, observaciones?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/inscripciones/${idInscripcion}/estado`, {
      estado_inscripcion: estado,
      observaciones
    });
  }

  // ============================================
  // EQUIPOS
  // ============================================

  obtenerEquipos(filtros?: any): Observable<{ equipos: Equipo[] }> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params = params.set(key, filtros[key]);
      });
    }
    return this.http.get<{ equipos: Equipo[] }>(`${this.apiUrl}/equipos`, { params });
  }

  obtenerEquipoPorId(id: number): Observable<{ equipo: Equipo }> {
    return this.http.get<{ equipo: Equipo }>(`${this.apiUrl}/equipos/${id}`);
  }

  cambiarEstadoEquipo(id: number, estado: string, observaciones?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/equipos/${id}/estado`, { estado, observaciones });
  }

  obtenerHistorialEquipo(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/equipos/${id}/historial`);
  }

  obtenerEstadisticasValidacion(idEquipo: number): Observable<EstadisticasValidacion> {
    return this.http.get<any>(`${this.apiUrl}/equipos/${idEquipo}/estadisticas-validacion`).pipe(
      map((response: any) => ({
        total_jugadores: response.total_jugadores || 0,
        jugadores_aprobados: response.jugadores_aprobados || 0,
        jugadores_rechazados: response.jugadores_rechazados || 0,
        jugadores_pendientes: response.jugadores_pendientes || 0,
        porcentaje_validado: response.porcentaje_validado || 0
      }))
    );
  }

  // ============================================
  // JUGADORES
  // ============================================

  obtenerJugadoresPorEquipo(idEquipo: number): Observable<{ jugadores: Jugador[] }> {
    return this.http.get<{ jugadores: Jugador[] }>(`${this.apiUrl}/jugadores/equipo/${idEquipo}`);
  }

  obtenerJugadoresConDocumentos(idEquipo: number): Observable<{ jugadores: Jugador[] }> {
    return this.http.get<{ jugadores: Jugador[] }>(`${this.apiUrl}/jugadores/equipo/${idEquipo}/documentos`);
  }

  validarJugador(idJugador: number, estado: 'aprobado' | 'rechazado', observaciones?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/jugadores/${idJugador}/validar`, {
      estado_validacion: estado,
      observaciones_validacion: observaciones
    });
  }

  // ============================================
  // PARTIDOS
  // ============================================

  obtenerPartidos(filtros?: any): Observable<any> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) params = params.set(key, filtros[key]);
      });
    }
    return this.http.get(`${this.apiUrl}/partidos`, { params });
  }

  obtenerPartidosPorCampeonato(idCampeonato: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/campeonatos/${idCampeonato}/partidos`);
  }

  obtenerPartidoPorId(idPartido: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/partidos/${idPartido}`);
  }


  // ============================================
  // CAMBIAR ESTADO DE PARTIDO
  // ============================================
  cambiarEstadoPartido(idPartido: number, estado: string, observaciones?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/partidos/${idPartido}/estado`, {
      estado,
      observaciones
    });
  }

  finalizarPartido(idPartido: number, datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/partidos/${idPartido}/finalizar`, datos);
  }

  registrarResultado(idPartido: number, golesLocal: number, golesVisitante: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/partidos/${idPartido}/resultado`, {
      goles_local: golesLocal,
      goles_visitante: golesVisitante
    });
  }

  reprogramarPartido(idPartido: number, datos: {
    fecha_partido?: string;
    lugar?: string;
    jornada?: number;
    mensaje?: string;
  }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/partidos/${idPartido}/reprogramar`, datos);
  }

  // ============================================
  // TABLA DE POSICIONES Y ESTADÍSTICAS
  // ============================================

  obtenerTablaPosiciones(idCampeonato: number, hastaJornada?: number): Observable<any> {
    let params = new HttpParams();
    if (hastaJornada !== undefined && hastaJornada !== null) {
      params = params.set('hasta_jornada', hastaJornada.toString());
    }
    return this.http.get(`${this.apiUrl}/partidos/campeonatos/${idCampeonato}/tabla-posiciones`, { params });
  }

  obtenerHistorialEquipoEnCampeonato(idCampeonato: number, idEquipo: number): Observable<any> {
    const params = new HttpParams().set('id_equipo', idEquipo.toString());
    return this.http.get(`${this.apiUrl}/partidos/campeonatos/${idCampeonato}/tabla-posiciones`, { params });
  }

  obtenerGoleadores(idCampeonato: number, limit?: number): Observable<any> {
    let params = new HttpParams();
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get(`${this.apiUrl}/partidos/campeonatos/${idCampeonato}/goleadores`, { params });
  }

  obtenerAsistencias(idCampeonato: number, limit?: number): Observable<any> {
    let params = new HttpParams();
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get(`${this.apiUrl}/partidos/campeonatos/${idCampeonato}/asistencias`, { params });
  }

  // ============================================
  // ESTADÍSTICAS GENERALES (LEGACY)
  // ============================================

  obtenerEstadisticasDisciplina(idCampeonato: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/estadisticas/disciplina?id_campeonato=${idCampeonato}`);
  }

  obtenerTablaDisciplina(idCampeonato?: number, limit?: number): Observable<any> {
    let params = new HttpParams();
    if (idCampeonato) params = params.set('id_campeonato', idCampeonato.toString());
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get(`${this.apiUrl}/tarjetas/disciplina`, { params });
  }

  // ============================================
  // ALINEACIONES - CORREGIDO ✅
  // ============================================

  /**
   * Obtiene las alineaciones de ambos equipos para un partido
   * 🔥 CORREGIDO: Ahora usa /organizador/partidos/{id}/alineaciones
   */
  obtenerAlineacionesPartido(idPartido: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/organizador/partidos/${idPartido}/alineaciones`);
  }

  /**
   * Valida que ambos equipos tengan alineación
   * 🔥 CORREGIDO: Ahora usa /organizador/partidos/{id}/validar-alineaciones
   */
  validarAlineacionesPartido(idPartido: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/organizador/partidos/${idPartido}/validar-alineaciones`);
  }

  // ============================================
  // EVENTOS DE PARTIDO
  // ============================================

  /**
   * Registra un evento en el partido (gol, tarjeta, etc)
   */
  registrarEvento(idPartido: number, evento: {
    tipo: 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | 'sustitucion';
    id_equipo: number;
    id_jugador: number;
    minuto: number;
    id_asistidor?: number;
    datos_adicionales?: any;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/organizador/partidos/${idPartido}/eventos`, evento);
  }

  /**
   * Obtiene todos los eventos de un partido
   */
  obtenerEventosPartido(idPartido: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/organizador/partidos/${idPartido}/eventos`);
  }

  /**
   * Elimina un evento (para corregir errores)
   */
  eliminarEvento(idPartido: number, idEvento: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/organizador/partidos/${idPartido}/eventos/${idEvento}`);
  }

  /**
   * Obtiene estadísticas del partido
   */
  obtenerEstadisticasPartido(idPartido: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/organizador/partidos/${idPartido}/estadisticas`);
  }

  /**
   * Obtener equipos con inscripción en un campeonato específico
   */
  obtenerEquiposPorCampeonato(idCampeonato: number, estado?: string): Observable<any> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http.get(`${this.apiUrl}/campeonatos/${idCampeonato}/equipos-inscritos`, { params });
  }


}