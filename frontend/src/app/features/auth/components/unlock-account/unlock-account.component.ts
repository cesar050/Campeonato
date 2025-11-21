import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ErrorResponse } from '../../../../core/models/usuario.model';

@Component({
  selector: 'app-unlock-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './unlock-account.component.html',
  styleUrl: './unlock-account.component.scss'
})
export class UnlockAccountComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  unlockForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    unlock_code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]]
  });

  ngOnInit(): void {
    // Obtener email desde query params si existe
    const email = this.route.snapshot.queryParams['email'];
    if (email) {
      this.unlockForm.patchValue({ email });
    }
  }

  onSubmit(): void {
    if (this.unlockForm.invalid) {
      this.unlockForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.unlockAccount(this.unlockForm.value).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set(response.mensaje);
        
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (error: ErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error || 'Código inválido o expirado');
      }
    });
  }

  // Formatear código mientras escribe (solo números)
  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    this.unlockForm.patchValue({ unlock_code: input.value });
  }

  get emailInvalid(): boolean {
    const control = this.unlockForm.get('email');
    return !!(control?.invalid && control?.touched);
  }

  get codeInvalid(): boolean {
    const control = this.unlockForm.get('unlock_code');
    return !!(control?.invalid && control?.touched);
  }
}
