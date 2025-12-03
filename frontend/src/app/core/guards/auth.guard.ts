import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para rutas que requieren autenticación
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.hasValidToken()) {
    return true;
  }

  // Guardar la URL a la que intentaba acceder
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

/**
 * Guard para rutas de invitado (login, register)
 * Redirige al dashboard si ya está autenticado
 */
/**export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.hasValidToken()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};*/

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.hasValidToken()) {
    const user = authService.currentUser();
    
    // Redirigir segun el rol
    if (user?.rol === 'superadmin') {
      router.navigate(['/superadmin/dashboard']);
    } else if (user?.rol === 'admin') {
      router.navigate(['/organizador/dashboard']);
    } else {
      router.navigate(['/dashboard']);
    }
    return false;
  }

  return true;
};

/**
 * Guard para rutas de admin
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  if (authService.isAdmin()) {
    return true;
  }

  // No tiene permisos de admin
  router.navigate(['/dashboard']);
  return false;
};

/**
 * Guard para rutas de líder o admin
 */
export const liderGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  const user = authService.currentUser();
  if (user?.rol === 'admin' || user?.rol === 'lider') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
  
};
/**
 * Guard para rutas de superadmin
 */
export const superadminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  
  if (user?.rol === 'superadmin') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};