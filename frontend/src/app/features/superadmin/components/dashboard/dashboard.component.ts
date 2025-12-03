import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SuperadminService } from '../../services/superadmin.service';

interface DashboardStats {
  total_organizadores: number;
  total_campeonatos: number;
  total_equipos: number;
  total_partidos: number;
  organizadores_activos: number;
  campeonatos_activos: number;
  solicitudes_pendientes: number;
  usuarios_totales: number;
  trend_organizadores?: number;
  trend_campeonatos?: number;
  trend_usuarios?: number;
  trend_solicitudes?: number;
}

interface RecentActivity {
  id: number;
  accion: string;
  usuario: string;
  fecha: string;
  estado: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private superadminService = inject(SuperadminService);
  private fb = inject(FormBuilder);

  isLoading = signal(true);
  showNuevoOrganizadorModal = signal(false);
  isCreatingOrganizador = signal(false);
  organizadorError = signal('');
  organizadorSuccess = signal('');

  stats = signal<DashboardStats>({
    total_organizadores: 0,
    total_campeonatos: 0,
    total_equipos: 0,
    total_partidos: 0,
    organizadores_activos: 0,
    campeonatos_activos: 0,
    solicitudes_pendientes: 0,
    usuarios_totales: 0
  });

  nuevoOrganizadorForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)]],
    nombre_campeonato: ['', [Validators.required, Validators.minLength(3)]]
  });

  recentActivities = signal<RecentActivity[]>([
    {
      id: 1,
      accion: 'Nuevo Organizador',
      usuario: 'Juan Pérez',
      fecha: '2024-07-15',
      estado: 'Aprobado'
    },
    {
      id: 2,
      accion: 'Campeonato Creado',
      usuario: 'Ana Gómez',
      fecha: '2024-07-14',
      estado: 'Completado'
    },
    {
      id: 3,
      accion: 'Solicitud de Retiro',
      usuario: 'Carlos Ruiz',
      fecha: '2024-07-14',
      estado: 'Pendiente'
    },
    {
      id: 4,
      accion: 'Actualización de Perfil',
      usuario: 'Laura Fernández',
      fecha: '2024-07-13',
      estado: 'Completado'
    }
  ]);

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.isLoading.set(true);
    this.superadminService.getDashboard().subscribe({
      next: (response) => {
        console.log('📊 Dashboard response:', response);
        
        if (response.estadisticas) {
          this.stats.set({
            total_organizadores: response.estadisticas.total_organizadores || 0,
            total_campeonatos: response.estadisticas.total_campeonatos || 0,
            total_equipos: response.estadisticas.total_equipos || 0,
            total_partidos: response.estadisticas.total_partidos || 0,
            organizadores_activos: response.estadisticas.organizadores_activos || 0,
            campeonatos_activos: response.estadisticas.campeonatos_activos || 0,
            solicitudes_pendientes: response.estadisticas.solicitudes_pendientes || 0,
            usuarios_totales: response.estadisticas.usuarios_totales || 0,
            trend_organizadores: response.estadisticas.trend_organizadores,
            trend_campeonatos: response.estadisticas.trend_campeonatos,
            trend_usuarios: response.estadisticas.trend_usuarios,
            trend_solicitudes: response.estadisticas.trend_solicitudes
          });
        } else {
          this.stats.set({
            total_organizadores: response.total_organizadores || 0,
            total_campeonatos: response.total_campeonatos || 0,
            total_equipos: response.total_equipos || 0,
            total_partidos: response.total_partidos || 0,
            organizadores_activos: response.organizadores_activos || 0,
            campeonatos_activos: response.campeonatos_activos || 0,
            solicitudes_pendientes: response.solicitudes_pendientes || 0,
            usuarios_totales: response.usuarios_totales || 0,
            trend_organizadores: response.trend_organizadores,
            trend_campeonatos: response.trend_campeonatos,
            trend_usuarios: response.trend_usuarios,
            trend_solicitudes: response.trend_solicitudes
          });
        }
        
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading dashboard:', err);
        this.isLoading.set(false);
        
        this.stats.set({
          total_organizadores: 1,
          total_campeonatos: 3,
          total_equipos: 0,
          total_partidos: 0,
          organizadores_activos: 1,
          campeonatos_activos: 0,
          solicitudes_pendientes: 0,
          usuarios_totales: 2
        });
      }
    });
  }

  openNuevoOrganizadorModal() {
    this.showNuevoOrganizadorModal.set(true);
    this.organizadorError.set('');
    this.organizadorSuccess.set('');
    this.nuevoOrganizadorForm.reset();
  }

  closeNuevoOrganizadorModal() {
    this.showNuevoOrganizadorModal.set(false);
    this.nuevoOrganizadorForm.reset();
    this.organizadorError.set('');
    this.organizadorSuccess.set('');
  }

  crearOrganizador() {
    console.log('🚀 Iniciando creación de organizador...');
    
    if (this.nuevoOrganizadorForm.invalid) {
      console.log('❌ Formulario inválido');
      console.log('Errores:', this.nuevoOrganizadorForm.errors);
      Object.keys(this.nuevoOrganizadorForm.controls).forEach(key => {
        const control = this.nuevoOrganizadorForm.get(key);
        if (control?.invalid) {
          console.log(`Campo ${key} inválido:`, control.errors);
        }
      });
      this.nuevoOrganizadorForm.markAllAsTouched();
      this.organizadorError.set('Por favor completa todos los campos correctamente');
      return;
    }

    this.isCreatingOrganizador.set(true);
    this.organizadorError.set('');
    this.organizadorSuccess.set('');

    const data = this.nuevoOrganizadorForm.value;
    console.log('📤 Datos del formulario:', data);
    
    this.superadminService.createOrganizador(data).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        this.isCreatingOrganizador.set(false);
        this.organizadorSuccess.set('Organizador creado exitosamente');
        
        // Mostrar credenciales temporales
        if (response.credenciales_temporales) {
          const credenciales = response.credenciales_temporales;
          alert(`✅ Organizador creado exitosamente!\n\n` +
                `📧 Email: ${credenciales.email}\n` +
                `🔑 Contraseña temporal: ${credenciales.password}\n\n` +
                `⚠️ IMPORTANTE: Guarda estas credenciales de forma segura.\n` +
                `El organizador debe cambiar su contraseña en el primer inicio de sesión.`);
        }
        
        // Cerrar modal y recargar
        setTimeout(() => {
          this.closeNuevoOrganizadorModal();
          this.loadDashboard();
        }, 1500);
      },
      error: (err) => {
        console.error('❌ Error completo:', err);
        console.error('❌ Status:', err.status);
        console.error('❌ Error body:', err.error);
        this.isCreatingOrganizador.set(false);
        
        let errorMessage = 'Error al crear el organizador';
        
        if (err.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.error) {
            errorMessage = err.error.error;
          }
        }
        
        this.organizadorError.set(errorMessage);
      }
    });
  }

  // Getters para validación del formulario
  get nombreInvalid(): boolean {
    const control = this.nuevoOrganizadorForm.get('nombre');
    return !!(control?.invalid && control?.touched);
  }

  get emailInvalid(): boolean {
    const control = this.nuevoOrganizadorForm.get('email');
    return !!(control?.invalid && control?.touched);
  }

  get campeonatoInvalid(): boolean {
    const control = this.nuevoOrganizadorForm.get('nombre_campeonato');
    return !!(control?.invalid && control?.touched);
  }

  getStatusClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'Aprobado': 'status-success',
      'Completado': 'status-success',
      'Pendiente': 'status-warning',
      'Rechazado': 'status-error'
    };
    return classes[estado] || 'status-default';
  }

  getTrendClass(trend: number | undefined): string {
    if (!trend) return '';
    return trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : '';
  }

  formatTrend(trend: number | undefined): string {
    if (!trend) return '';
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend}%`;
  }
}