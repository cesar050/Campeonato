import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ErrorResponse } from '../../../../core/models/usuario.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  registeredEmail = signal<string | null>(null);

  registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, this.gmailValidator]],
    contrasena: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
    confirmarContrasena: ['', [Validators.required]],
    rol: ['lider']
  }, {
    validators: this.passwordMatchValidator
  });

  // Validador personalizado para Gmail
  gmailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value?.toLowerCase();
    if (email && !email.endsWith('@gmail.com')) {
      return { gmailOnly: true };
    }
    return null;
  }

  // Validador de fortaleza de contraseña
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const errors: ValidationErrors = {};

    if (!/[A-Z]/.test(password)) {
      errors['noUppercase'] = true;
    }
    if (!/[a-z]/.test(password)) {
      errors['noLowercase'] = true;
    }
    if (!/[0-9]/.test(password)) {
      errors['noNumber'] = true;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors['noSpecial'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  // Validador de contraseñas coincidentes
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('contrasena')?.value;
    const confirmPassword = group.get('confirmarContrasena')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmarContrasena')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { confirmarContrasena, ...registerData } = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set(response.mensaje);
        this.registeredEmail.set(response.email);
        this.registerForm.reset();
      },
      error: (error: ErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error || 'Error al registrar usuario');
      }
    });
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  // Getters para validaciones
  get nombreInvalid(): boolean {
    const control = this.registerForm.get('nombre');
    return !!(control?.invalid && control?.touched);
  }

  get emailInvalid(): boolean {
    const control = this.registerForm.get('email');
    return !!(control?.invalid && control?.touched);
  }

  get passwordInvalid(): boolean {
    const control = this.registerForm.get('contrasena');
    return !!(control?.invalid && control?.touched);
  }

  get confirmPasswordInvalid(): boolean {
    const control = this.registerForm.get('confirmarContrasena');
    return !!(control?.invalid && control?.touched);
  }

  // Getter para la fortaleza de la contraseña
  get passwordStrength(): { level: string; percentage: number; color: string } {
    const password = this.registerForm.get('contrasena')?.value || '';
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) return { level: 'Débil', percentage: 25, color: '#dc2626' };
    if (score <= 4) return { level: 'Media', percentage: 50, color: '#f59e0b' };
    if (score <= 5) return { level: 'Fuerte', percentage: 75, color: '#10b981' };
    return { level: 'Muy fuerte', percentage: 100, color: '#059669' };
  }
}
