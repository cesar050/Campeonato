import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SuperadminService } from '../../services/superadmin.service';

interface OrganizadorDetalle {
  id_usuario: number;
  nombre: string;
  email: string;
  activo: boolean;
  email_verified: boolean;
  fecha_registro: string;
  last_login_at: string;
  campeonato: {
    nombre: string;
    estado: string;
    equipos_count: number;
  };
}

interface ActividadReciente {
  id: number;
  accion: string;
  fecha: string;
  detalles: string;
}

@Component({
  selector: 'app-organizador-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './organizador-detalle.component.html',
  styleUrls: ['./organizador-detalle.component.scss']
})
export class OrganizadorDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private superadminService = inject(SuperadminService);

  isLoading = signal(true);
  organizadorId = signal<number>(0);
  organizador = signal<OrganizadorDetalle | null>(null);
  actividadReciente = signal<ActividadReciente[]>([]);
  
  activeTab = signal<'informacion' | 'campeonato' | 'actividad'>('informacion');

  showReenviarModal = signal(false);
  showEliminarModal = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.organizadorId.set(parseInt(id));
      this.loadOrganizadorDetalle();
    }
  }

  loadOrganizadorDetalle() {
    this.isLoading.set(true);
    this.superadminService.getOrganizadorDetalle(this.organizadorId()).subscribe({
      next: (response) => {
        this.organizador.set(response.organizador);
        this.actividadReciente.set(response.actividad_reciente || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading organizador:', err);
        this.isLoading.set(false);
        this.router.navigate(['/superadmin/organizadores']);
      }
    });
  }

  setActiveTab(tab: 'informacion' | 'campeonato' | 'actividad') {
    this.activeTab.set(tab);
  }

  toggleEstado() {
    const estado = !this.organizador()?.activo;
    this.superadminService.updateOrganizadorEstado(this.organizadorId(), estado).subscribe({
      next: () => {
        this.loadOrganizadorDetalle();
      },
      error: (err) => {
        console.error('Error updating estado:', err);
      }
    });
  }

  reenviarCredenciales() {
    this.superadminService.reenviarCredenciales(this.organizadorId()).subscribe({
      next: (response) => {
        alert('Credenciales reenviadas exitosamente');
        this.showReenviarModal.set(false);
      },
      error: (err) => {
        alert('Error al reenviar credenciales');
      }
    });
  }

  eliminarOrganizador() {
    this.superadminService.deleteOrganizador(this.organizadorId()).subscribe({
      next: () => {
        alert('Organizador eliminado exitosamente');
        this.router.navigate(['/superadmin/organizadores']);
      },
      error: (err) => {
        alert('Error al eliminar organizador');
      }
    });
  }

  getRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours === 1) return 'Hace 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hace 1 dia';
    if (diffDays < 30) return `Hace ${diffDays} dias`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  volver() {
    this.router.navigate(['/superadmin/organizadores']);
  }
}