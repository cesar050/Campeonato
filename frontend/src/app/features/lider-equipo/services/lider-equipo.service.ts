import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  Equipo,
  Jugador,
  Partido,
  Notificacion,
  CampeonatoDisponible,
  PaginationParams,
  PaginatedResponse,
  Alineacion,
  AlineacionDefinir
} from '../models/lider-equipo.models';

@Injectable({
  providedIn: 'root'
})
export class LiderEquipoService {
  private baseUrl = 'http://localhost:5000';
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${this.baseUrl}/lider`;
  }

  // ============================================
  // EQUIPOS
  // ============================================
  obtenerMisEquipos(): Observable<{ equipos: Equipo[]; total_equipos: number }> {
    return this.http.get<{ equipos: Equipo[]; total_equipos: number }>(`${this.baseUrl}/lider/mis-equipos`);
  }

  crearEquipo(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/equipos`, data);
  }
  
  subirLogo(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/upload/logo`, formData);
  }

  actualizarEquipo(idEquipo: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/equipos/${idEquipo}`, data);
  }

  eliminarEquipo(idEquipo: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/equipos/${idEquipo}`);
  }

  obtenerEquipoPorId(idEquipo: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/equipos/${idEquipo}`);
  }

  obtenerInscripcionesPorCampeonato(idCampeonato: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/inscripciones/campeonato/${idCampeonato}`);
  }

  // ============================================
  // JUGADORES
  // ============================================
  obtenerJugadores(
    idEquipo: number,
    params?: PaginationParams
  ): Observable<PaginatedResponse<Jugador>> {
    let httpParams = new HttpParams().set('id_equipo', idEquipo.toString());
  
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.per_page) httpParams = httpParams.set('per_page', params.per_page.toString());
      if (params.buscar) httpParams = httpParams.set('buscar', params.buscar);
      if (params.posicion) httpParams = httpParams.set('posicion', params.posicion);
      if (params.activo !== undefined) httpParams = httpParams.set('activo', params.activo.toString());
      if (params.ordenar_por) httpParams = httpParams.set('ordenar_por', params.ordenar_por);
      if (params.orden) httpParams = httpParams.set('orden', params.orden);
    }
  
    console.log('🌐 [SERVICE] GET /jugadores con params:', httpParams.toString());
  
    return this.http.get<PaginatedResponse<Jugador>>(`${this.baseUrl}/jugadores`, { params: httpParams });
  }

  crearJugador(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/jugadores`, data);
  }

  actualizarJugador(idJugador: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/jugadores/${idJugador}`, data);
  }

  eliminarJugador(idJugador: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/jugadores/${idJugador}`);
  }

  subirDocumentoJugador(idJugador: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/jugadores/${idJugador}/upload-documento`, formData);
  }
  
  subirFotoJugador(idJugador: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/jugadores/${idJugador}/upload-foto`, formData);
  }

  // ============================================
  // PARTIDOS
  // ============================================
  obtenerPartidos(
    idEquipo: number,
    params?: PaginationParams
  ): Observable<PaginatedResponse<Partido>> {
    let httpParams = new HttpParams().set('id_equipo', idEquipo.toString());

    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.per_page) httpParams = httpParams.set('per_page', params.per_page.toString());
      if (params.estado) httpParams = httpParams.set('estado', params.estado);
    }

    return this.http.get<PaginatedResponse<Partido>>(`${this.baseUrl}/lider/partidos`, { params: httpParams });
  }

  obtenerPartidoPorId(idPartido: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/partidos/${idPartido}`);
  }

  obtenerEventosPartido(idPartido: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/lider/partidos/${idPartido}/eventos`);
  }

  // ============================================
  // CAMPEONATOS
  // ============================================
  obtenerCampeonatosPublicos(
    tipoDeporte?: string,
    estado?: string,
    buscar?: string
  ): Observable<{ campeonatos: CampeonatoDisponible[] }> {
    let httpParams = new HttpParams();

    if (tipoDeporte) httpParams = httpParams.set('tipo_deporte', tipoDeporte);
    if (estado) httpParams = httpParams.set('estado', estado);
    if (buscar) httpParams = httpParams.set('buscar', buscar);

    return this.http.get<{ campeonatos: CampeonatoDisponible[] }>(
      `${this.baseUrl}/campeonatos/publicos`,
      { params: httpParams }
    );
  }

  buscarCampeonatoPorCodigo(codigo: string): Observable<{ campeonato: CampeonatoDisponible }> {
    const httpParams = new HttpParams().set('codigo', codigo.toUpperCase());
    
    return this.http.get<{ campeonato: CampeonatoDisponible }>(
      `${this.baseUrl}/campeonatos/buscar-por-codigo`,
      { params: httpParams }
    );
  }

  inscribirEquipo(idCampeonato: number, idEquipo: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/campeonatos/${idCampeonato}/inscripciones`, {
      id_equipo: idEquipo
    });
  }

  obtenerCampeonatosDisponibles(params?: any): Observable<{ campeonatos: CampeonatoDisponible[] }> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.tipo_deporte) httpParams = httpParams.set('tipo_deporte', params.tipo_deporte);
      if (params.buscar) httpParams = httpParams.set('buscar', params.buscar);
    }

    return this.http.get<{ campeonatos: CampeonatoDisponible[] }>(
      `${this.baseUrl}/lider/campeonatos-disponibles`,
      { params: httpParams }
    );
  }

  // ============================================
  // ALINEACIONES
  // ============================================
  
  /**
   * 🔥 Define la alineación completa para un partido
   */
  definirAlineacion(data: any): Observable<any> {
    console.log('📤 [SERVICE] Enviando alineación al backend:', data);
    return this.http.post(`${this.baseUrl}/lider/alineaciones/definir`, data);
  }

  /**
   * Obtiene la alineación de un equipo para un partido
   */
  obtenerAlineacion(idPartido: number, idEquipo: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/lider/alineaciones`, {
      params: {
        id_partido: idPartido.toString(),
        id_equipo: idEquipo.toString()
      }
    });
  }

  /**
   * Elimina la alineación de un equipo para un partido
   */
  eliminarAlineacion(idPartido: number, idEquipo: number): Observable<any> {
    return this.obtenerAlineacion(idPartido, idEquipo).pipe(
      switchMap((response: any) => {
        const alineaciones = response.alineaciones || [];
        const deleteRequests = alineaciones.map((a: any) =>
          this.http.delete(`http://localhost:5001/alineaciones/${a.id_alineacion}`)
        );
        return deleteRequests.length > 0 ? forkJoin(deleteRequests) : of(null);
      })
    );
  }

  /**
   * Realiza un cambio de jugador durante el partido
   */
  hacerCambio(data: {
    id_partido: number;
    id_equipo: number;
    id_jugador_sale: number;
    id_jugador_entra: number;
    minuto: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/lider/alineaciones/cambio`, data);
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================
  
  obtenerMisCampeonatos(idEquipo: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/estadisticas/mis-campeonatos/${idEquipo}`);
  }

  obtenerTablaPosiciones(idCampeonato: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/estadisticas/tabla-posiciones/${idCampeonato}`);
  }

  obtenerGoleadoresEquipo(idEquipo: number, idCampeonato?: number): Observable<any> {
    let params = new HttpParams();
    if (idCampeonato) params = params.set('id_campeonato', idCampeonato.toString());
    return this.http.get(`${this.apiUrl}/estadisticas/goleadores/${idEquipo}`, { params });
  }

  obtenerAsistidoresEquipo(idEquipo: number, idCampeonato?: number): Observable<any> {
    let params = new HttpParams();
    if (idCampeonato) params = params.set('id_campeonato', idCampeonato.toString());
    return this.http.get(`${this.apiUrl}/estadisticas/asistidores/${idEquipo}`, { params });
  }

  obtenerEstadisticasJugadores(idEquipo: number, idCampeonato?: number): Observable<any> {
    let params = new HttpParams();
    if (idCampeonato) params = params.set('id_campeonato', idCampeonato.toString());
    return this.http.get(`${this.apiUrl}/estadisticas/jugadores/${idEquipo}`, { params });
  }

  obtenerCampeonatosGanados(idEquipo: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/estadisticas/campeonatos-ganados/${idEquipo}`);
  }

  obtenerEstadisticasEquipo(idEquipo: number, idCampeonato?: number): Observable<any> {
    let params = new HttpParams();
    if (idCampeonato) params = params.set('id_campeonato', idCampeonato.toString());
    return this.http.get(`${this.apiUrl}/estadisticas/equipo/${idEquipo}`, { params });
  }

  // ============================================
  // NOTIFICACIONES
  // ============================================
  obtenerNotificaciones(params?: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/notificaciones`, { params });
  }

  marcarNotificacionLeida(idNotificacion: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/notificaciones/${idNotificacion}/leer`, {});
  }

  marcarTodasLeidas(): Observable<any> {
    return this.http.put(`${this.apiUrl}/notificaciones/leer-todas`, {});
  }

  eliminarNotificacion(idNotificacion: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notificaciones/${idNotificacion}`);
  }

  contarNoLeidas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notificaciones/contar-no-leidas`);
  }
}