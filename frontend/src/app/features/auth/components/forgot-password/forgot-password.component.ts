import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl || 'http://localhost:5000';

  step = signal<'email' | 'code' | 'success'>('email');
  isLoading = signal(false);
  errorMessage = signal('');
  maskedEmail = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  emailForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  resetForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required]]
  });

  sendCode() {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.post(`${this.apiUrl}/auth/forgot-password`, this.emailForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.maskedEmail.set(this.getMaskedEmail(this.emailForm.value.email));
        this.step.set('code');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Error al enviar el código');
      }
    });
  }

  resetPassword() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    if (this.resetForm.value.new_password !== this.resetForm.value.confirm_password) {
      this.errorMessage.set('Las contraseñas no coinciden');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const data = {
      email: this.emailForm.value.email,
      code: this.resetForm.value.code,
      new_password: this.resetForm.value.new_password
    };

    this.http.post(`${this.apiUrl}/auth/reset-password`, data).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.step.set('success');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Error al restablecer la contraseña');
      }
    });
  }

  getMaskedEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 4) {
      return `${username.charAt(0)}${'*'.repeat(username.length - 1)}@${domain}`;
    }
    const firstTwo = username.substring(0, 2);
    const lastTwo = username.substring(username.length - 2);
    const masked = '*'.repeat(username.length - 4);
    return `${firstTwo}${masked}${lastTwo}@${domain}`;
  }

  changeEmail() {
    this.step.set('email');
    this.resetForm.reset();
    this.errorMessage.set('');
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update(v => !v);
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}