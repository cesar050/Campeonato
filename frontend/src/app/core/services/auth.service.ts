import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Usuario,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshRequest,
  RefreshResponse,
  UnlockRequest,
  MessageResponse,
  ErrorResponse
} from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = `${environment.apiUrl}/auth`;

  // Signals para estado reactivo (Angular 17+)
  private currentUserSignal = signal<Usuario | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private isLoadingSignal = signal<boolean>(false);

  // Computed signals
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.isAuthenticatedSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.rol === 'admin');
  readonly isLider = computed(() => this.currentUserSignal()?.rol === 'lider');
  readonly isSuperAdmin = computed(() => this.currentUserSignal()?.rol === 'superadmin');

  constructor() {
    this.loadStoredUser();
  }

  // ============================================
  // 🔐 MÉTODOS DE AUTENTICACIÓN
  // ============================================

  /**
   * Registro de nuevo usuario
   */
  register(data: RegisterRequest): Observable<RegisterResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<RegisterResponse>(`${this.API_URL}/register`, data).pipe(
      tap(() => this.isLoadingSignal.set(false)),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Login de usuario
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        this.storeTokens(response.access_token, response.refresh_token);
        this.storeUser(response.usuario);
        this.currentUserSignal.set(response.usuario);
        this.isAuthenticatedSignal.set(true);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Logout del usuario
   */
  /**
 * Logout del usuario
 */
logout(): void {
  console.log('Logout iniciado...');
  
  // Intentar logout en el servidor, pero NO esperar respuesta
  this.http.post<MessageResponse>(`${this.API_URL}/logout`, {}).subscribe({
    next: () => console.log('Logout exitoso en servidor'),
    error: (err) => console.warn('Error en logout del servidor (pero continuamos):', err)
  });
  
  // Limpiar sesión INMEDIATAMENTE (no esperar al servidor)
  this.clearSession();
  console.log('Sesión limpiada');
}

  /**
   * Logout sin llamar al servidor (para casos de error)
   */
  forceLogout(): void {
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Refrescar access token
   */
  refreshToken(): Observable<RefreshResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request: RefreshRequest = { refresh_token: refreshToken };
    return this.http.post<RefreshResponse>(`${this.API_URL}/refresh`, request).pipe(
      tap(response => {
        localStorage.setItem(environment.tokenKey, response.access_token);
      }),
      catchError(error => {
        this.forceLogout();
        return this.handleError(error);
      })
    );
  }

  /**
   * Obtener usuario actual desde el servidor
   */
  getCurrentUser(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.API_URL}/me`).pipe(
      tap(user => {
        this.currentUserSignal.set(user);
        this.storeUser(user);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Desbloquear cuenta
   */
  unlockAccount(data: UnlockRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.API_URL}/unlock`, data).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Reenviar email de verificación
   */
  resendVerificationEmail(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.API_URL}/resend-verification`, { email }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // ============================================
  // 🔧 MÉTODOS DE ALMACENAMIENTO
  // ============================================

  private storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(environment.tokenKey, accessToken);
    localStorage.setItem(environment.refreshTokenKey, refreshToken);
  }

  private storeUser(user: Usuario): void {
    localStorage.setItem(environment.userKey, JSON.stringify(user));
  }

  private loadStoredUser(): void {
    const token = this.getAccessToken();
    const userStr = localStorage.getItem(environment.userKey);

    if (token && userStr) {
      try {
        const user: Usuario = JSON.parse(userStr);
        this.currentUserSignal.set(user);
        this.isAuthenticatedSignal.set(true);
      } catch {
        this.clearSession();
      }
    }
  }

  private clearSession(): void {
    localStorage.removeItem(environment.tokenKey);
    localStorage.removeItem(environment.refreshTokenKey);
    localStorage.removeItem(environment.userKey);
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
  }

  // ============================================
  // 🔑 GETTERS DE TOKENS
  // ============================================

  getAccessToken(): string | null {
    return localStorage.getItem(environment.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(environment.refreshTokenKey);
  }

  hasValidToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      // Decodificar JWT para verificar expiración
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convertir a milisegundos
      return Date.now() < expiry;
    } catch {
      return false;
    }
  }

  // ============================================
  // ⚠️ MANEJO DE ERRORES
  // ============================================

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorResponse: ErrorResponse;

    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorResponse = {
        error: 'Error de conexión',
        mensaje: 'No se pudo conectar con el servidor'
      };
    } else {
      // Error del servidor
      errorResponse = error.error as ErrorResponse;
    }

    return throwError(() => errorResponse);
  }
}
