import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SuperadminService } from '../../services/superadmin.service';

interface DashboardStats {
  total_organizadores: number;
  organizadores_activos: number;
  total_campeonatos: number;
  campeonatos_activos: number;
  campeonatos_planificacion?: number;
  campeonatos_finalizados?: number;
  total_equipos?: number;
  total_partidos?: number;
  solicitudes_pendientes: number;
  usuarios_totales: number;
  usuarios_espectadores?: number;
  usuarios_lideres?: number;
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

interface CrecimientoData {
  fecha: string;
  usuarios: number;
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
    organizadores_activos: 0,
    total_campeonatos: 0,
    campeonatos_activos: 0,
    campeonatos_planificacion: 0,
    campeonatos_finalizados: 0,
    total_equipos: 0,
    total_partidos: 0,
    solicitudes_pendientes: 0,
    usuarios_totales: 0,
    usuarios_espectadores: 0,
    usuarios_lideres: 0
  });

  recentActivities = signal<RecentActivity[]>([]);
  crecimientoUsuarios = signal<CrecimientoData[]>([]);

  nuevoOrganizadorForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)]],
    nombre_campeonato: ['', [Validators.required, Validators.minLength(3)]]
  });

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    console.log('📊 Cargando dashboard...');
    this.isLoading.set(true);
    
    this.superadminService.getDashboard().subscribe({
      next: (response) => {
        console.log('📊 Dashboard response:', response);
        
        // Manejar la respuesta con la estructura correcta
        if (response.estadisticas) {
          this.stats.set({
            total_organizadores: response.estadisticas.total_organizadores || 0,
            organizadores_activos: response.estadisticas.organizadores_activos || 0,
            total_campeonatos: response.estadisticas.total_campeonatos || 0,
            campeonatos_activos: response.estadisticas.campeonatos_activos || 0,
            campeonatos_planificacion: response.estadisticas.campeonatos_planificacion || 0,
            campeonatos_finalizados: response.estadisticas.campeonatos_finalizados || 0,
            solicitudes_pendientes: response.estadisticas.solicitudes_pendientes || 0,
            usuarios_totales: response.estadisticas.usuarios_totales || 0,
            usuarios_espectadores: response.estadisticas.usuarios_espectadores || 0,
            usuarios_lideres: response.estadisticas.usuarios_lideres || 0,
            trend_organizadores: response.estadisticas.trend_organizadores,
            trend_campeonatos: response.estadisticas.trend_campeonatos,
            trend_usuarios: response.estadisticas.trend_usuarios,
            trend_solicitudes: response.estadisticas.trend_solicitudes
          });
        }

        // Actividad reciente
        if (response.actividad_reciente && Array.isArray(response.actividad_reciente)) {
          this.recentActivities.set(response.actividad_reciente);
        }

        // Crecimiento de usuarios
        if (response.crecimiento_usuarios && Array.isArray(response.crecimiento_usuarios)) {
          this.crecimientoUsuarios.set(response.crecimiento_usuarios);
        }
        
        this.isLoading.set(false);
        console.log('✅ Dashboard cargado exitosamente');
      },
      error: (err) => {
        console.error('❌ Error loading dashboard:', err);
        this.isLoading.set(false);
        
        // Mantener valores por defecto en caso de error
        console.log('⚠️ Usando valores por defecto debido al error');
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
        this.organizadorSuccess.set('¡Organizador creado exitosamente!');
        
        // Mostrar credenciales temporales
        if (response.credenciales_temporales) {
          const credenciales = response.credenciales_temporales;
          
          // Crear mensaje formateado para alert
          const mensaje = `
✅ ¡Organizador creado exitosamente!

📧 Email: ${credenciales.email}
🔑 Contraseña temporal: ${credenciales.password}

⚠️ IMPORTANTE: 
${credenciales.nota}

Copia estas credenciales ahora, no se volverán a mostrar.
          `.trim();
          
          alert(mensaje);
        }
        
        // Cerrar modal y recargar después de 1.5 segundos
        setTimeout(() => {
          this.closeNuevoOrganizadorModal();
          this.loadDashboard();
        }, 1500);
      },
      error: (err) => {
        console.error('❌ Error completo:', err);
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

  // Utilidades
  getStatusClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'Aprobado': 'status-success',
      'Completado': 'status-success',
      'Pendiente': 'status-warning',
      'Rechazado': 'status-error'
    };
    return classes[estado] || 'status-default';
  }

  getTrendClass(trend: number): string {
    if (trend > 0) return 'trend-up';
    if (trend < 0) return 'trend-down';
    return 'trend-neutral';
  }

  formatTrend(trend: number): string {
    if (trend === 0) return '0%';
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend}%`;
  }

  getCurrentDate(): string {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('es-ES', options);
  }
}