// Modelo que coincide con el to_dict() del backend
export interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  email_verified: boolean;
  rol: 'admin' | 'lider' | 'espectador';
  activo: boolean;
  failed_login_attempts: number;
  last_login_at: string | null;
  last_login_ip: string | null;
  fecha_registro: string | null;
}

// Interfaces para las peticiones
export interface LoginRequest {
  email: string;
  contrasena: string;
}

export interface RegisterRequest {
  nombre: string;
  email: string;
  contrasena: string;
  rol?: 'admin' | 'lider';
}

export interface UnlockRequest {
  email: string;
  unlock_code: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

// Interfaces para las respuestas del backend
export interface LoginResponse {
  mensaje: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  usuario: Usuario;
}

export interface RegisterResponse {
  mensaje: string;
  info: string;
  email: string;
}

export interface MessageResponse {
  mensaje: string;
  info?: string;
}

export interface ErrorResponse {
  error: string;
  mensaje?: string;
  attempts_remaining?: number;
  warning?: string;
  locked_until?: string;
  minutes_remaining?: number;
  info?: string;
  unlock_code?: string;
  action?: string;
}

export interface RefreshResponse {
  mensaje: string;
  access_token: string;
  expires_in: number;
}
