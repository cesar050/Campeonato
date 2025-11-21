import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ErrorResponse } from '../../../../core/models/usuario.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals para estado reactivo
  isLoading = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  warningMessage = signal<string | null>(null);
  attemptsRemaining = signal<number | null>(null);
  isLocked = signal(false);
  lockedUntil = signal<string | null>(null);
  minutesRemaining = signal<number | null>(null);
  unlockInfo = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.clearMessages();

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        // Redirigir al returnUrl o al dashboard
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (error: ErrorResponse) => {
        this.isLoading.set(false);
        this.handleLoginError(error);
      }
    });
  }

  private handleLoginError(error: ErrorResponse): void {
    // Verificar si la cuenta está bloqueada
    if (error.locked_until || error.error === 'Cuenta bloqueada') {
      this.isLocked.set(true);
      this.lockedUntil.set(error.locked_until || null);
      this.minutesRemaining.set(error.minutes_remaining || null);
      this.unlockInfo.set(error.info || null);
      this.errorMessage.set(error.mensaje || 'Cuenta bloqueada temporalmente');
      return;
    }

    // Verificar intentos restantes
    if (error.attempts_remaining !== undefined) {
      this.attemptsRemaining.set(error.attempts_remaining);
      this.warningMessage.set(error.warning || null);
    }

    // Mensaje de error general
    this.errorMessage.set(error.error || 'Error al iniciar sesión');
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.warningMessage.set(null);
    this.attemptsRemaining.set(null);
    this.isLocked.set(false);
    this.lockedUntil.set(null);
    this.minutesRemaining.set(null);
    this.unlockInfo.set(null);
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  goToUnlock(): void {
    const email = this.loginForm.get('email')?.value;
    this.router.navigate(['/auth/unlock'], { queryParams: { email } });
  }

  // Getters para validaciones
  get emailInvalid(): boolean {
    const control = this.loginForm.get('email');
    return !!(control?.invalid && control?.touched);
  }

  get passwordInvalid(): boolean {
    const control = this.loginForm.get('contrasena');
    return !!(control?.invalid && control?.touched);
  }
}
