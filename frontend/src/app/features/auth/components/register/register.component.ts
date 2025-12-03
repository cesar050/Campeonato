import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordStrength = signal<'weak' | 'medium' | 'strong'>('weak');
  registerSuccess = signal(false);

  registerForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, this.gmailValidator]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    rol: ['lider'], // FIJO como lider
    acceptTerms: [false, [Validators.requiredTrue]]
  }, { validators: this.passwordMatchValidator });

  gmailValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const isGmail = control.value.toLowerCase().endsWith('@gmail.com');
    return isGmail ? null : { notGmail: true };
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onPasswordChange() {
    const password = this.registerForm.get('password')?.value || '';
    if (password.length === 0) {
      this.passwordStrength.set('weak');
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) this.passwordStrength.set('weak');
    else if (strength <= 4) this.passwordStrength.set('medium');
    else this.passwordStrength.set('strong');
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { confirmPassword, acceptTerms, ...registerData } = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.registerSuccess.set(true);
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Error al crear la cuenta');
      }
    });
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update(v => !v);
  }

  get nombreInvalid(): boolean {
    const control = this.registerForm.get('nombre');
    return !!(control?.invalid && control?.touched);
  }

  get emailInvalid(): boolean {
    const control = this.registerForm.get('email');
    return !!(control?.invalid && control?.touched);
  }

  get passwordInvalid(): boolean {
    const control = this.registerForm.get('password');
    return !!(control?.invalid && control?.touched);
  }

  get confirmPasswordInvalid(): boolean {
    const control = this.registerForm.get('confirmPassword');
    return !!(control?.invalid && control?.touched) || this.registerForm.hasError('passwordMismatch');
  }
}