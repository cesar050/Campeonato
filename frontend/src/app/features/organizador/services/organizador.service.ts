import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrganizadorService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl || 'http://localhost:5000';

  // DASHBOARD
  getDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/organizador/dashboard`);
  }

  // CAMPEONATOS
  getMiCampeonato(): Observable<any> {
    return this.http.get(`${this.apiUrl}/campeonatos`);
  }

  getCampeonato(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/campeonatos/${id}`);
  }

  crearCampeonato(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/campeonatos`, data);
  }

  actualizarCampeonato(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/campeonatos/${id}`, data);
  }

  cambiarEstado(id: number, estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/campeonatos/${id}/estado`, { estado });
  }

  // PARTIDOS
  getPartidos(idCampeonato: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/campeonatos/${idCampeonato}/partidos`);
  }

  generarPartidos(idCampeonato: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/campeonatos/${idCampeonato}/generar-partidos`, data);
  }

  // EQUIPOS
  getEquipos(idCampeonato?: number): Observable<any> {
    const url = idCampeonato 
      ? `${this.apiUrl}/equipos?id_campeonato=${idCampeonato}`
      : `${this.apiUrl}/equipos`;
    return this.http.get(url);
  }

  getEquipo(idEquipo: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/equipos/${idEquipo}`);
  }

  aprobarEquipo(idEquipo: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/equipos/${idEquipo}/aprobar`, {});
  }

  rechazarEquipo(idEquipo: number, motivo?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/equipos/${idEquipo}/rechazar`, { motivo });
  }
}