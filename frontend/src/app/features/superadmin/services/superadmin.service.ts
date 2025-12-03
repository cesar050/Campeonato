import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SuperadminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl || 'http://localhost:5000';

  // Dashboard
  getDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/superadmin/dashboard`);
  }

  // Organizadores
  getOrganizadores(): Observable<any> {
    return this.http.get(`${this.apiUrl}/superadmin/organizadores`);
  }

  createOrganizador(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/superadmin/organizadores`, data);
  }

  getOrganizador(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/superadmin/organizadores/${id}`);
  }

  updateOrganizador(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/superadmin/organizadores/${id}`, data);
  }

  deleteOrganizador(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/superadmin/organizadores/${id}`);
  }

  resendCredentials(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/superadmin/organizadores/${id}/resend-credentials`, {});
  }

  // Analytics
  getAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/superadmin/analytics`);
  }
}