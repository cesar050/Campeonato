import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PerfilService, Perfil, PreferenciasUsuario, EstadisticasPerfil } from '../../core/services/perfil.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

type TabType = 'informacion' | 'seguridad' | 'preferencias' | 'estadisticas';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToastComponent,
    ConfirmDialogComponent,
    DatePipe
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {
  private perfilService = inject(PerfilService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Tabs
  activeTab = signal<TabType>('informacion');

  // Loading states
  loading = signal(false);
  loadingEstadisticas = signal(false);
  uploadingFoto = signal(false);

  // Datos
  perfil = signal<Perfil | null>(null);
  preferencias = signal<PreferenciasUsuario | null>(null);
  estadisticas = signal<EstadisticasPerfil | null>(null);

  // Forms
  perfilForm!: FormGroup;
  preferenciasForm!: FormGroup;

  // Foto
  fotoFile = signal<File | null>(null);
  previewFoto = signal<string | null>(null);
  showDeleteFotoConfirm = signal(false);

  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');

  ngOnInit(): void {
    this.inicializarForms();
    this.cargarPerfil();
    this.cargarPreferencias();
    this.cargarEstadisticas();
  }

  inicializarForms(): void {
    this.perfilForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      apellido: ['', [Validators.maxLength(100)]],
      biografia: ['', [Validators.maxLength(500)]]
    });

    this.preferenciasForm = this.fb.group({
      idioma: ['es', Validators.required],
      tema: ['claro', Validators.required],
      color_primario: ['verde', Validators.required],
      formato_fecha: ['DD/MM/YYYY', Validators.required],
      zona_horaria: ['America/Guayaquil', Validators.required],
      notificaciones_email: [true],
      notificaciones_push: [true]
    });
  }

  cargarPerfil(): void {
    this.loading.set(true);
    this.perfilService.getPerfil().subscribe({
      next: (response) => {
        this.perfil.set(response.perfil);
        this.perfilForm.patchValue({
          nombre: response.perfil.nombre || '',
          apellido: response.perfil.apellido || '',
          biografia: response.perfil.biografia || ''
        });
        if (response.perfil.foto_url) {
          this.previewFoto.set(response.perfil.foto_url);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.mostrarToast('error', 'Error', error.error?.error || 'Error al cargar el perfil');
        this.loading.set(false);
      }
    });
  }

  cargarPreferencias(): void {
    this.perfilService.getPreferencias().subscribe({
      next: (response) => {
        this.preferencias.set(response.preferencias);
        this.preferenciasForm.patchValue({
          idioma: response.preferencias.idioma || 'es',
          tema: response.preferencias.tema || 'claro',
          color_primario: response.preferencias.color_primario || 'verde',
          formato_fecha: response.preferencias.formato_fecha || 'DD/MM/YYYY',
          zona_horaria: response.preferencias.zona_horaria || 'America/Guayaquil',
          notificaciones_email: response.preferencias.notificaciones_email ?? true,
          notificaciones_push: response.preferencias.notificaciones_push ?? true
        });
      },
      error: (error) => {
        console.warn('Error cargando preferencias:', error);
      }
    });
  }

  cargarEstadisticas(): void {
    this.loadingEstadisticas.set(true);
    this.perfilService.getEstadisticas().subscribe({
      next: (response) => {
        this.estadisticas.set(response.estadisticas);
        this.loadingEstadisticas.set(false);
      },
      error: (error) => {
        console.warn('Error cargando estadísticas:', error);
        this.loadingEstadisticas.set(false);
      }
    });
  }

  guardarPerfil(): void {
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      this.mostrarToast('warning', 'Validación', 'Por favor completa todos los campos requeridos');
      return;
    }

    this.loading.set(true);
    const data = {
      nombre: this.perfilForm.value.nombre,
      apellido: this.perfilForm.value.apellido || null,
      biografia: this.perfilForm.value.biografia || null
    };

    this.perfilService.updatePerfil(data).subscribe({
      next: (response) => {
        this.perfil.set(response.perfil);
        this.mostrarToast('success', 'Éxito', 'Perfil actualizado exitosamente');
        this.loading.set(false);
      },
      error: (error) => {
        this.mostrarToast('error', 'Error', error.error?.error || 'Error al actualizar el perfil');
        this.loading.set(false);
      }
    });
  }

  guardarPreferencias(): void {
    if (this.preferenciasForm.invalid) {
      this.preferenciasForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.perfilService.updatePreferencias(this.preferenciasForm.value).subscribe({
      next: (response) => {
        this.preferencias.set(response.preferencias);
        this.preferenciasForm.patchValue({
          idioma: response.preferencias.idioma,
          tema: response.preferencias.tema || 'claro',
          color_primario: response.preferencias.color_primario || 'verde',
          formato_fecha: response.preferencias.formato_fecha,
          zona_horaria: response.preferencias.zona_horaria,
          notificaciones_email: response.preferencias.notificaciones_email,
          notificaciones_push: response.preferencias.notificaciones_push
        });
        this.mostrarToast('success', 'Éxito', 'Preferencias actualizadas exitosamente');
        this.loading.set(false);
      },
      error: (error) => {
        this.mostrarToast('error', 'Error', error.error?.error || 'Error al actualizar las preferencias');
        this.loading.set(false);
      }
    });
  }

  onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.mostrarToast('error', 'Error', 'Formato no permitido. Use JPG, JPEG o PNG');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        this.mostrarToast('error', 'Error', 'El archivo es muy grande. Máximo 2MB');
        return;
      }

      this.fotoFile.set(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewFoto.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  subirFoto(): void {
    const file = this.fotoFile();
    if (!file) {
      this.mostrarToast('warning', 'Advertencia', 'Selecciona una foto primero');
      return;
    }

    this.uploadingFoto.set(true);
    this.perfilService.uploadFoto(file).subscribe({
      next: (response) => {
        this.previewFoto.set(response.foto_url);
        this.fotoFile.set(null);
        const currentPerfil = this.perfil();
        if (currentPerfil) {
          currentPerfil.foto_url = response.foto_url;
          this.perfil.set({ ...currentPerfil });
        }
        this.mostrarToast('success', 'Éxito', 'Foto subida exitosamente');
        this.uploadingFoto.set(false);
      },
      error: (error) => {
        this.mostrarToast('error', 'Error', error.error?.error || 'Error al subir la foto');
        this.uploadingFoto.set(false);
      }
    });
  }

  eliminarFoto(): void {
    this.showDeleteFotoConfirm.set(true);
  }

  confirmarEliminarFoto(confirmed: boolean): void {
    if (confirmed) {
      this.loading.set(true);
      this.perfilService.deleteFoto().subscribe({
        next: () => {
          this.previewFoto.set(null);
          this.fotoFile.set(null);
          const currentPerfil = this.perfil();
          if (currentPerfil) {
            currentPerfil.foto_url = undefined;
            this.perfil.set({ ...currentPerfil });
          }
          this.mostrarToast('success', 'Éxito', 'Foto eliminada exitosamente');
          this.loading.set(false);
        },
        error: (error) => {
          this.mostrarToast('error', 'Error', error.error?.error || 'Error al eliminar la foto');
          this.loading.set(false);
        }
      });
    }
    this.showDeleteFotoConfirm.set(false);
  }

  cambiarPassword(): void {
    this.mostrarToast('info', 'Información', 'Funcionalidad de cambio de contraseña próximamente');
  }

  cambiarTab(tab: TabType): void {
    this.activeTab.set(tab);
  }

  mostrarToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType.set(type);
    this.toastTitle.set(title);
    this.toastMessage.set(message);
    this.showToast.set(true);
  }

  cerrarToast(): void {
    this.showToast.set(false);
  }

  getRolLabel(): string {
    const rol = this.perfil()?.rol;
    switch (rol) {
      case 'superadmin':
        return 'Super Administrador';
      case 'admin':
        return 'Organizador';
      case 'lider':
        return 'Líder de Equipo';
      default:
        return rol || 'Usuario';
    }
  }

  getEstadoLabel(): string {
    const perfil = this.perfil();
    if (!perfil) return 'Desconocido';
    if (perfil.locked_until) {
      return 'Bloqueada';
    }
    return perfil.activo ? 'Activa' : 'Inactiva';
  }

  getEstadoBadgeClass(): string {
    const perfil = this.perfil();
    if (!perfil) return 'bg-gray-500';
    if (perfil.locked_until) {
      return 'bg-red-500';
    }
    return perfil.activo ? 'bg-green-500' : 'bg-gray-500';
  }
}
