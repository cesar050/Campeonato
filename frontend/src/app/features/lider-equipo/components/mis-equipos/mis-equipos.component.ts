import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LiderEquipoService } from '../../services/lider-equipo.service';
import { Equipo } from '../../models/lider-equipo.models';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-mis-equipos',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './mis-equipos.component.html',
  styleUrls: ['./mis-equipos.component.scss']
})
export class MisEquiposComponent implements OnInit {
  loading = signal(true);
  equipos = signal<Equipo[]>([]);
  errorMessage = signal('');
  showModal = signal(false);

  equipoForm!: FormGroup;
  logoFile: File | null = null;
  logoPreview: string | null = null;

  constructor(
    private liderService: LiderEquipoService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.cargarEquipos();
  }

  initForm(): void {
    this.equipoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      estadio: ['', [Validators.required]],
      tipo_deporte: ['indoor', [Validators.required]],
      max_jugadores: [''],
      logo_url: ['']
    });
  }

  // ============================================
  // MANEJO DE ARCHIVO DE LOGO
  // ============================================
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        alert('Solo se permiten archivos de imagen');
        return;
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen no debe superar 2MB');
        return;
      }

      this.logoFile = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeLogoPreview(): void {
    this.logoFile = null;
    this.logoPreview = null;
    this.equipoForm.patchValue({ logo_url: '' });
  }

  // ============================================
  // CRUD DE EQUIPOS
  // ============================================
  cargarEquipos(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.liderService.obtenerMisEquipos().subscribe({
      next: (response) => {
        this.equipos.set(response.equipos);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar equipos:', error);
        this.errorMessage.set('Error al cargar equipos');
        this.loading.set(false);
      }
    });
  }

  abrirModal(): void {
    this.equipoForm.reset({
      tipo_deporte: 'indoor'
    });
    this.logoFile = null;
    this.logoPreview = null;
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
    this.equipoForm.reset();
    this.logoFile = null;
    this.logoPreview = null;
  }

  crearEquipo(): void {
    if (this.equipoForm.invalid) {
      this.equipoForm.markAllAsTouched();
      return;
    }

    const user = this.authService.currentUser();
    if (!user) {
      alert('Error: Usuario no autenticado');
      return;
    }

    // Si hay archivo de logo, primero subir la imagen
    if (this.logoFile) {
      this.subirLogoYCrearEquipo(user);
    } else {
      // Crear equipo sin logo
      this.crearEquipoDirecto(user);
    }
  }

  subirLogoYCrearEquipo(user: any): void {
    const formData = new FormData();
    formData.append('logo', this.logoFile!);

    // Primero subir el logo
    this.liderService.subirLogo(formData).subscribe({
      next: (response: any) => {
        // Una vez subido, crear el equipo con la URL del logo
        this.equipoForm.patchValue({ logo_url: response.logo_url });
        this.crearEquipoDirecto(user);
      },
      error: (error) => {
        console.error('Error al subir logo:', error);
        // Preguntar si quiere continuar sin logo
        if (confirm('Error al subir el logo. ¿Deseas crear el equipo sin logo?')) {
          this.crearEquipoDirecto(user);
        }
      }
    });
  }

  crearEquipoDirecto(user: any): void {
    const equipoData = {
      ...this.equipoForm.value,
      nombre_lider: user.nombre
    };

    // Asignar max_jugadores según tipo
    if (!equipoData.max_jugadores) {
      equipoData.max_jugadores = equipoData.tipo_deporte === 'indoor' ? 12 : 22;
    }

    this.liderService.crearEquipo(equipoData).subscribe({
      next: () => {
        this.cerrarModal();
        this.cargarEquipos();
        alert('Equipo creado exitosamente');

        // Limpiar preview
        this.logoFile = null;
        this.logoPreview = null;
      },
      error: (error) => {
        console.error('Error al crear equipo:', error);
        alert('Error al crear equipo: ' + (error.error?.error || 'Error desconocido'));
      }
    });
  }

  // ============================================
  // HELPERS
  // ============================================
  getEstadoBadgeClass(estado: string): string {
    const classes: any = {
      'aprobado': 'badge-success',
      'pendiente': 'badge-warning',
      'rechazado': 'badge-danger'
    };
    return classes[estado] || 'badge-secondary';
  }

  getEstadoTexto(estado: string): string {
    const textos: any = {
      'aprobado': 'APROBADO',
      'pendiente': 'PENDIENTE',
      'rechazado': 'RECHAZADO'
    };
    return textos[estado] || estado.toUpperCase();
  }

  getTipoDeporteTexto(tipo: string): string {
    return tipo === 'futbol' ? 'Fútbol 11' : 'Indoor / Fútbol 5';
  }
}