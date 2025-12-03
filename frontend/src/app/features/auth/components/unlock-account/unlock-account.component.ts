import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-unlock-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './unlock-account.component.html',
  styleUrls: ['./unlock-account.component.scss']
})
export class UnlockAccountComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl || 'http://localhost:5000';

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  countdown = signal('');

  unlockForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  private countdownInterval: any;

  ngOnInit() {
    this.startCountdown();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  startCountdown() {
    // Simular 10 minutos de bloqueo
    let seconds = 600;
    
    this.countdownInterval = setInterval(() => {
      seconds--;
      
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      
      this.countdown.set(`${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      
      if (seconds <= 0) {
        clearInterval(this.countdownInterval);
        this.countdown.set('00:00');
      }
    }, 1000);
  }

  onSubmit() {
    if (this.unlockForm.invalid) {
      this.unlockForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.post(`${this.apiUrl}/auth/unlock`, this.unlockForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Cuenta desbloqueada exitosamente');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Código inválido o expirado');
      }
    });
  }

  resendCode() {
    const email = this.unlockForm.get('email')?.value;
    if (!email) {
      this.errorMessage.set('Por favor ingresa tu email primero');
      return;
    }

    this.isLoading.set(true);
    this.http.post(`${this.apiUrl}/auth/resend-unlock-code`, { email }).subscribe({
      next: () => {
        this.isLoading.set(false);
        alert('Código reenviado a tu email');
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al reenviar el código');
      }
    });
  }
}