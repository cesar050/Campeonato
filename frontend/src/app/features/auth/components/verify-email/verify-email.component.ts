import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        @if (isLoading()) {
          <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Verificando tu email...</p>
        }
        
        @if (success()) {
          <div class="text-green-600 mb-4">
            <svg class="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">¡Email Verificado!</h2>
          <p class="text-gray-600 mb-6">Tu cuenta ha sido activada exitosamente.</p>
          <a routerLink="/auth/login" 
             class="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition">
            Iniciar Sesión
          </a>
        }
        
        @if (error()) {
          <div class="text-red-600 mb-4">
            <svg class="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Error de Verificación</h2>
          <p class="text-gray-600 mb-6">{{ errorMessage() }}</p>
          <a routerLink="/auth/login" 
             class="inline-block bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition">
            Volver al Login
          </a>
        }
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  
  isLoading = signal(true);
  success = signal(false);
  error = signal(false);
  errorMessage = signal('');

  ngOnInit() {
    const token = this.route.snapshot.queryParams['token'];
    
    if (!token) {
      this.isLoading.set(false);
      this.error.set(true);
      this.errorMessage.set('Token de verificación no encontrado');
      return;
    }

    // Llamar al backend para verificar
    this.http.get(`${environment.apiUrl}/auth/verify-email?token=${token}`)
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.success.set(true);
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 3000);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.error.set(true);
          this.errorMessage.set(err.error?.error || 'Error al verificar el email');
        }
      });
  }
}