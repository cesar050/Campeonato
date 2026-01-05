import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const liderGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtener usuario desde localStorage directamente
  const userStr = localStorage.getItem('user');
  
  if (!userStr) {
    router.navigate(['/auth/login']);
    return false;
  }

  try {
    const user = JSON.parse(userStr);

    // Permitir acceso a líder, admin y superadmin
    if (user.rol === 'lider' || user.rol === 'admin' || user.rol === 'superadmin') {
      return true;
    }

    // Si no es líder, redirigir al dashboard general
    router.navigate(['/dashboard']);
    return false;
    
  } catch (error) {
    router.navigate(['/auth/login']);
    return false;
  }
};