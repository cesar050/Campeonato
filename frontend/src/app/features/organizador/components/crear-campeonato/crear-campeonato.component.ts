import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrganizadorService } from '../../services/organizador.service';

@Component({
  selector: 'app-crear-campeonato',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-campeonato.component.html',
  styleUrls: ['./crear-campeonato.component.scss']
})
export class CrearCampeonatoComponent {
  private fb = inject(FormBuilder);
  private organizadorService = inject(OrganizadorService);
  private router = inject(Router);

  currentStep = signal(1);
  isSubmitting = signal(false);
  errorMessage = signal('');

  infoForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]]
  });

  configForm: FormGroup = this.fb.group({
    fecha_inicio: ['', [Validators.required]],
    fecha_fin: ['', [Validators.required]],
    max_equipos: [16, [Validators.required, Validators.min(2)]],
    tipo_competicion: ['eliminacion_directa', [Validators.required]]
  });

  tiposCompeticion = [
    {
      id: 'liga',
      nombre: 'Liga',
      descripcion: 'Todos los equipos juegan entre sí. Ideal para torneos largos.',
      icon: 'list'
    },
    {
      id: 'eliminacion_directa',
      nombre: 'Eliminación Directa',
      descripcion: 'El ganador avanza, el perdedor es eliminado. Rápido y emocionante.',
      icon: 'zap'
    },
    {
      id: 'mixto',
      nombre: 'Mixto',
      descripcion: 'Combina una fase de grupos (liga) con una fase de eliminación.',
      icon: 'shuffle'
    }
  ];

  nextStep() {
    if (this.currentStep() === 1) {
      if (this.infoForm.invalid) {
        this.infoForm.markAllAsTouched();
        return;
      }
      this.currentStep.set(2);
    } else if (this.currentStep() === 2) {
      if (this.configForm.invalid) {
        this.configForm.markAllAsTouched();
        return;
      }
      this.currentStep.set(3);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  onSubmit() {
    if (this.infoForm.invalid || this.configForm.invalid) {
      this.errorMessage.set('Por favor completa todos los campos requeridos');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const campeonatoData = {
      ...this.infoForm.value,
      ...this.configForm.value
    };

    this.organizadorService.crearCampeonato(campeonatoData).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        setTimeout(() => {
          this.router.navigate(['/organizador/mi-campeonato']);
        }, 1500);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Error al crear el campeonato');
      }
    });
  }

  getTipoCompeticionNombre(): string {
    const tipoId = this.configForm.get('tipo_competicion')?.value;
    const tipo = this.tiposCompeticion.find(t => t.id === tipoId);
    return tipo?.nombre || '';
  }

  get nombreInvalid(): boolean {
    const control = this.infoForm.get('nombre');
    return !!(control?.invalid && control?.touched);
  }

  get descripcionInvalid(): boolean {
    const control = this.infoForm.get('descripcion');
    return !!(control?.invalid && control?.touched);
  }

  get fechaInicioInvalid(): boolean {
    const control = this.configForm.get('fecha_inicio');
    return !!(control?.invalid && control?.touched);
  }

  get fechaFinInvalid(): boolean {
    const control = this.configForm.get('fecha_fin');
    return !!(control?.invalid && control?.touched);
  }

  get maxEquiposInvalid(): boolean {
    const control = this.configForm.get('max_equipos');
    return !!(control?.invalid && control?.touched);
  }

  incrementEquipos() {
    const current = this.configForm.get('max_equipos')?.value || 16;
    this.configForm.patchValue({ max_equipos: current + 1 });
  }

  decrementEquipos() {
    const current = this.configForm.get('max_equipos')?.value || 16;
    if (current > 2) {
      this.configForm.patchValue({ max_equipos: current - 1 });
    }
  }

  selectTipoCompeticion(tipo: string) {
    this.configForm.patchValue({ tipo_competicion: tipo });
  }
}