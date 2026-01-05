import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SuperadminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/superadmin`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('Dashboard response:', response)),
        catchError(error => {
          console.error('Dashboard error:', error);
          return throwError(() => error);
        })
      );
  }

  getOrganizadores(search?: string, estado?: string, orden?: string): Observable<any> {
    let params = new HttpParams();
    
    if (search) {
      params = params.set('search', search);
    }
    if (estado) {
      params = params.set('estado', estado);
    }
    if (orden) {
      params = params.set('orden', orden);
    }

    return this.http.get(`${this.apiUrl}/organizadores`, { 
      headers: this.getHeaders(),
      params: params
    }).pipe(
      tap(response => console.log('Organizadores response:', response)),
      catchError(error => {
        console.error('Organizadores error:', error);
        return throwError(() => error);
      })
    );
  }

  getOrganizadorDetalle(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/organizadores/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('Organizador detalle response:', response)),
        catchError(error => {
          console.error('Organizador detalle error:', error);
          return throwError(() => error);
        })
      );
  }

  createOrganizador(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/organizadores`, data, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('Create organizador response:', response)),
        catchError(error => {
          console.error('Create organizador error:', error);
          return throwError(() => error);
        })
      );
  }

  updateOrganizadorEstado(id: number, activo: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/organizadores/${id}`, { activo }, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('Update estado response:', response)),
        catchError(error => {
          console.error('Update estado error:', error);
          return throwError(() => error);
        })
      );
  }

  reenviarCredenciales(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/organizadores/${id}/reenviar-credenciales`, {}, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('Reenviar credenciales response:', response)),
        catchError(error => {
          console.error('Reenviar credenciales error:', error);
          return throwError(() => error);
        })
      );
  }

  deleteOrganizador(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/organizadores/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(response => console.log('Delete organizador response:', response)),
        catchError(error => {
          console.error('Delete organizador error:', error);
          return throwError(() => error);
        })
      );
  }

  getCampeonatos(search?: string, estado?: string, orden?: string): Observable<any> {
    let params = new HttpParams();
    
    if (search) {
      params = params.set('search', search);
    }
    if (estado) {
      params = params.set('estado', estado);
    }
    if (orden) {
      params = params.set('orden', orden);
    }

    return this.http.get(`${this.apiUrl}/campeonatos`, { 
      headers: this.getHeaders(),
      params: params
    }).pipe(
      tap(response => console.log('Campeonatos response:', response)),
      catchError(error => {
        console.error('Campeonatos error:', error);
        return throwError(() => error);
      })
    );
  }

  getUsuarios(search?: string, rol?: string, estado?: string, orden?: string): Observable<any> {
    let params = new HttpParams();
    
    if (search) {
      params = params.set('search', search);
    }
    if (rol) {
      params = params.set('rol', rol);
    }
    if (estado) {
      params = params.set('estado', estado);
    }
    if (orden) {
      params = params.set('orden', orden);
    }

    return this.http.get(`${this.apiUrl}/usuarios`, { 
      headers: this.getHeaders(),
      params: params
    }).pipe(
      tap(response => console.log('Usuarios response:', response)),
      catchError(error => {
        console.error('Usuarios error:', error);
        return throwError(() => error);
      })
    );
  }
}