import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Perfil {
  id_usuario: number;
  nombre: string;
  apellido?: string;
  foto_url?: string;
  biografia?: string;
  email: string;
  email_verified: boolean;
  rol: string;
  activo: boolean;
  failed_login_attempts: number;
  last_login_at?: string;
  last_login_ip?: string;
  password_changed_at?: string;
  locked_until?: string;
  fecha_registro: string;
  preferencias?: PreferenciasUsuario;
}

export interface PreferenciasUsuario {
  id: number;
  id_usuario: number;
  idioma: 'es' | 'en' | 'pt-BR';
  tema: 'claro' | 'oscuro' | 'auto';
  color_primario: 'verde' | 'azul' | 'rojo' | 'purpura' | 'naranja' | 'cyan' | 'rosa' | 'amarillo';
  formato_fecha: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  zona_horaria: string;
  notificaciones_email: boolean;
  notificaciones_push: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface PerfilUpdate {
  nombre?: string;
  apellido?: string;
  biografia?: string;
}

export interface PreferenciasUpdate {
  idioma?: 'es' | 'en' | 'pt-BR';
  tema?: 'claro' | 'oscuro' | 'auto';
  color_primario?: 'verde' | 'azul' | 'rojo' | 'purpura' | 'naranja' | 'cyan' | 'rosa' | 'amarillo';
  formato_fecha?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  zona_horaria?: string;
  notificaciones_email?: boolean;
  notificaciones_push?: boolean;
}

export interface EstadisticasPerfil {
  // Superadmin
  total_usuarios_activos?: number;
  total_campeonatos?: number;
  total_equipos_sistema?: number; // Renombrado para superadmin
  // Admin
  campeonatos_gestionados?: number;
  total_equipos_inscritos?: number; // Renombrado para admin
  proximo_campeonato?: {
    id_campeonato: number;
    nombre: string;
    fecha_inicio: string;
  };
  // Lider
  equipo?: {
    id_equipo: number;
    nombre: string;
    estado: string;
  };
  total_jugadores?: number;
  proximo_partido?: {
    id_partido: number;
    fecha: string;
    rival: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/perfil`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private getHeadersFormData(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getPerfil(): Observable<{ mensaje: string; perfil: Perfil }> {
    return this.http.get<{ mensaje: string; perfil: Perfil }>(this.apiUrl, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error obteniendo perfil:', error);
        return throwError(() => error);
      })
    );
  }

  updatePerfil(data: PerfilUpdate): Observable<{ mensaje: string; perfil: Perfil }> {
    return this.http.put<{ mensaje: string; perfil: Perfil }>(this.apiUrl, data, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error actualizando perfil:', error);
        return throwError(() => error);
      })
    );
  }

  uploadFoto(file: File): Observable<{ mensaje: string; foto_url: string }> {
    const formData = new FormData();
    formData.append('foto', file);

    return this.http.post<{ mensaje: string; foto_url: string }>(`${this.apiUrl}/foto`, formData, {
      headers: this.getHeadersFormData()
    }).pipe(
      catchError(error => {
        console.error('Error subiendo foto:', error);
        return throwError(() => error);
      })
    );
  }

  deleteFoto(): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/foto`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error eliminando foto:', error);
        return throwError(() => error);
      })
    );
  }

  getPreferencias(): Observable<{ mensaje: string; preferencias: PreferenciasUsuario }> {
    return this.http.get<{ mensaje: string; preferencias: PreferenciasUsuario }>(`${this.apiUrl}/preferencias`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error obteniendo preferencias:', error);
        return throwError(() => error);
      })
    );
  }

  updatePreferencias(data: PreferenciasUpdate): Observable<{ mensaje: string; preferencias: PreferenciasUsuario }> {
    return this.http.put<{ mensaje: string; preferencias: PreferenciasUsuario }>(`${this.apiUrl}/preferencias`, data, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error actualizando preferencias:', error);
        return throwError(() => error);
      })
    );
  }

  getEstadisticas(): Observable<{ mensaje: string; estadisticas: EstadisticasPerfil }> {
    return this.http.get<{ mensaje: string; estadisticas: EstadisticasPerfil }>(`${this.apiUrl}/estadisticas`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error obteniendo estadísticas:', error);
        return throwError(() => error);
      })
    );
  }
}

