import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OrganizadorService } from '../../services/organizador.service';
import { DatepickerComponent } from '../../../../shared/components/datepicker/datepicker.component';

@Component({
  selector: 'app-crear-campeonato',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,DatepickerComponent],
  templateUrl: './crear-campeonato.component.html',
  styleUrls: ['./crear-campeonato.component.scss']
})
export class CrearCampeonatoComponent {
  pasoActual = signal(1);
  formulario: FormGroup;
  loading = signal(false);
  
  // Alertas
  mostrarAlerta = signal(false);
  tipoAlerta = signal<'success' | 'error' | 'warning'>('error');
  mensajeAlerta = signal('');
  codigoGenerado = signal<string | null>(null);

  tiposDeporte = [
    { value: 'futbol', label: 'Fútbol 11', icon: 'sports_soccer', descripcion: 'Fútbol tradicional con 11 jugadores por equipo' },
    { value: 'indoor', label: 'Fútbol Indoor', icon: 'sports', descripcion: 'Fútbol sala con 12 jugadores por equipo' }
  ];

  tiposCompeticion = [
    { 
      value: 'liga', 
      label: 'Liga', 
      descripcion: 'Todos los equipos juegan entre sí. Ideal para torneos largos.',
      icon: 'emoji_events'
    },
    { 
      value: 'eliminacion_directa', 
      label: 'Eliminación Directa', 
      descripcion: 'El ganador avanza, el perdedor es eliminado. Rápido y emocionante.',
      icon: 'whatshot'
    },
    { 
      value: 'mixto', 
      label: 'Mixto', 
      descripcion: 'Combina una fase de grupos (liga) con una fase de eliminación.',
      icon: 'sync_alt'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private organizadorService: OrganizadorService
  ) {
    this.formulario = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      tipo_deporte: ['futbol', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      max_equipos: ['16', [Validators.required, Validators.min(2), Validators.max(64)]],
      tipo_competicion: ['eliminacion_directa', Validators.required],
      fecha_inicio_inscripciones: [''],
      fecha_cierre_inscripciones: [''], 
      es_publico: [true]
    });
  }

  mostrarMensaje(tipo: 'success' | 'error' | 'warning', mensaje: string): void {
    this.tipoAlerta.set(tipo);
    this.mensajeAlerta.set(mensaje);
    this.mostrarAlerta.set(true);
    
    setTimeout(() => {
      this.mostrarAlerta.set(false);
    }, 5000);
  }

  cerrarAlerta(): void {
    this.mostrarAlerta.set(false);
  }

  siguientePaso(): void {
    if (this.pasoActual() === 1) {
      const paso1Valid = this.formulario.get('nombre')?.valid && 
                         this.formulario.get('descripcion')?.valid &&
                         this.formulario.get('tipo_deporte')?.valid;
      
      if (!paso1Valid) {
        this.mostrarMensaje('warning', 'Por favor completa todos los campos requeridos del paso 1');
        return;
      }
      this.pasoActual.set(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (this.pasoActual() === 2) {
      const paso2Valid = this.formulario.get('fecha_inicio')?.valid && 
                         this.formulario.get('fecha_fin')?.valid &&
                         this.formulario.get('max_equipos')?.valid &&
                         this.formulario.get('tipo_competicion')?.valid;
      
      if (!paso2Valid) {
        this.mostrarMensaje('warning', 'Por favor completa todos los campos requeridos del paso 2');
        return;
      }
      this.pasoActual.set(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual() > 1) {
      this.pasoActual.update(p => p - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  volver(): void {
    this.router.navigate(['/organizador/dashboard']);
  }

  crearCampeonato(): void {
    if (this.formulario.invalid) {
      this.mostrarMensaje('error', 'Por favor completa todos los campos requeridos');
      return;
    }
  
    this.loading.set(true);
    const datos = {
      ...this.formulario.value,
      max_equipos: parseInt(this.formulario.value.max_equipos)
    };
  
    this.organizadorService.crearCampeonato(datos).subscribe({
      next: (response) => {
        // Si es privado, guardar el código
        if (!datos.es_publico && response.campeonato?.codigo_inscripcion) {
          this.codigoGenerado.set(response.campeonato.codigo_inscripcion);
          this.mostrarMensaje('success', 
            `¡Campeonato creado! Código de inscripción: ${response.campeonato.codigo_inscripcion}`
          );
        } else {
          this.mostrarMensaje('success', '¡Campeonato público creado exitosamente!');
        }
        
        setTimeout(() => {
          this.router.navigate(['/organizador/mi-campeonato']);
        }, 3000);  // Dar más tiempo para ver el código
      },
      error: (error) => {
        console.error('Error al crear campeonato:', error);
        this.mostrarMensaje('error', error.error?.mensaje || 'Error al crear campeonato');
        this.loading.set(false);
      }
    });
  }

  seleccionarTipoDeporte(tipo: string): void {
    this.formulario.patchValue({ tipo_deporte: tipo });
  }

  seleccionarTipoCompeticion(tipo: string): void {
    this.formulario.patchValue({ tipo_competicion: tipo });
  }

  onMaxEquiposChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value;
    
    // Permitir escribir mientras tipea
    if (valor === '' || valor === '0') {
      return;
    }

    const numero = parseInt(valor);
    
    if (isNaN(numero)) {
      input.value = '2';
      this.formulario.patchValue({ max_equipos: '2' });
      this.mostrarMensaje('error', 'Ingresa un número válido');
      return;
    }

    if (numero < 2) {
      input.value = '2';
      this.formulario.patchValue({ max_equipos: '2' });
      this.mostrarMensaje('error', 'No se puede crear un campeonato con menos de 2 equipos');
      return;
    }

    if (numero > 64) {
      input.value = '64';
      this.formulario.patchValue({ max_equipos: '64' });
      this.mostrarMensaje('error', 'El máximo de equipos es 64');
      return;
    }

    this.formulario.patchValue({ max_equipos: valor });
  }

  onMaxEquiposBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value === '' || input.value === '0') {
      input.value = '2';
      this.formulario.patchValue({ max_equipos: '2' });
    }
  }
  
  onFechaChange(campo: string, valor: string): void {
    this.formulario.patchValue({ [campo]: valor });
  }
}