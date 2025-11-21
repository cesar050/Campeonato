import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);

  // No agregar token a rutas de auth (excepto logout y me)
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/verify-email', '/auth/unlock', '/auth/refresh'];
  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));

  if (isPublicRoute) {
    return next(req);
  }

  // Agregar token si existe
  const token = authService.getAccessToken();
  if (token) {
    req = addToken(req, token);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el token expiró (401), intentar refresh
      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        return handleTokenExpired(req, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function handleTokenExpired(req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService) {
  return authService.refreshToken().pipe(
    switchMap(response => {
      // Reintentar la petición original con el nuevo token
      return next(addToken(req, response.access_token));
    }),
    catchError(error => {
      // Si el refresh falla, cerrar sesión
      authService.forceLogout();
      return throwError(() => error);
    })
  );
}
