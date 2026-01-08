import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  accountLocked = signal(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [false]
  });

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.accountLocked.set(false);

    const loginData = {
      email: this.loginForm.value.email,
      contrasena: this.loginForm.value.password
    };

    console.log('Sending login request...', loginData);

    this.authService.login(loginData).subscribe({
      next: (response) => {
        console.log('✅ Login successful! Full response:', response);
        
        this.isLoading.set(false);

        // Verificar estructura de la respuesta
        const user = response.usuario || (response as any).user;

        if (!user) {
          console.error('❌ No user data in response:', response);
          this.errorMessage.set('Error en la respuesta del servidor');
          return;
        }

        console.log('👤 User data:', user);
        console.log('🔑 User role:', user.rol);

        // ============================================
        // GUARDAR TOKEN Y USUARIO EN LOCALSTORAGE
        // ============================================
        if (response.access_token) {
          console.log('💾 Saving token to localStorage...');
          localStorage.setItem('token', response.access_token);
        } else {
          console.error('❌ No access_token in response!');
        }

        console.log('💾 Saving user to localStorage...');
        localStorage.setItem('user', JSON.stringify(user));

        console.log('✅ Token and user saved successfully!');

        // Verificar si hay returnUrl
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];

        if (returnUrl) {
          console.log('↪️ Redirecting to returnUrl:', returnUrl);
          this.router.navigateByUrl(returnUrl);
        } 
        // ============================================
        // REDIRIGIR SEGÚN EL ROL
        // ============================================
        else if (user.rol === 'superadmin') {
          console.log('👑 Redirecting to superadmin dashboard');
          this.router.navigate(['/superadmin/dashboard']);
        } 
        else if (user.rol === 'admin') {
          console.log('⚙️ Redirecting to organizador dashboard');
          this.router.navigate(['/organizador/dashboard']);
        } 
        else if (user.rol === 'lider') {
          console.log('⚽ Redirecting to lider-equipo dashboard');
          this.router.navigate(['/lider-equipo/dashboard']);
        } 
        else {
          console.log('❓ Unknown role, redirecting to default dashboard');
          this.router.navigate(['/dashboard']);
        }

        console.log('🎯 Navigation command sent!');
      },
      error: (err) => {
        console.error('❌ Login error:', err);
        console.error('Status:', err.status);
        console.error('Error body:', err.error);
        
        this.isLoading.set(false);

        if (err.status === 403) {
          // Verificar si es por email no verificado
          if (err.error?.error === 'Email no verificado') {
            this.errorMessage.set('⚠️ Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada (incluyendo spam).');
          } else {
            // Es por cuenta bloqueada
            this.accountLocked.set(true);
            
            if (err.error?.locked_until) {
              const lockedUntil = new Date(err.error.locked_until);
              const now = new Date();
              const minutesLeft = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
              
              this.errorMessage.set(
                `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutesLeft} minutos.`
              );
            } else {
              this.errorMessage.set('Cuenta bloqueada temporalmente por intentos fallidos.');
            }
          }
        }
        else if (err.status === 401) {
          this.errorMessage.set('Las credenciales proporcionadas son incorrectas.');
        } 
        else if (err.error?.error) {
          this.errorMessage.set(err.error.error);
        } 
        else {
          this.errorMessage.set('Error al iniciar sesión. Inténtalo de nuevo.');
        }
      }
    });
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  get emailInvalid(): boolean {
    const control = this.loginForm.get('email');
    return !!(control?.invalid && control?.touched);
  }

  get passwordInvalid(): boolean {
    const control = this.loginForm.get('password');
    return !!(control?.invalid && control?.touched);
  }
}
