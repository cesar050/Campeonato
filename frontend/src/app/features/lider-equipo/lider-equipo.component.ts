import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AccessibilityCenterComponent } from '../../shared/components/accessibility-center/accessibility-center.component';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: string;
}

@Component({
  selector: 'app-lider-equipo',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, AccessibilityCenterComponent, ConfirmDialogComponent],
  templateUrl: './lider-equipo.component.html',
  styleUrls: ['./lider-equipo.component.scss']
})
export class LiderEquipoComponent implements OnInit {
  isCollapsed = signal(false);
  showAccessibilityCenter = signal(false);
  showConfirmLogout = signal(false);
  currentUser = signal<Usuario | null>(null);

  menuItems = [
    { icon: 'dashboard', label: 'Información General', route: '/lider-equipo/dashboard' },
    { icon: 'shield', label: 'Mis Equipos', route: '/lider-equipo/mis-equipos' },
    { icon: 'groups', label: 'Jugadores', route: '/lider-equipo/jugadores' },
    { icon: 'sports_soccer', label: 'Partidos', route: '/lider-equipo/partidos' },
    { icon: 'format_list_numbered', label: 'Alineaciones', route: '/lider-equipo/alineaciones' },
    { icon: 'grid_view', label: 'Formaciones', route: '/lider-equipo/formaciones' },
    { icon: 'analytics', label: 'Estadísticas', route: '/lider-equipo/estadisticas' },
    { icon: 'search', label: 'Campeonatos', route: '/lider-equipo/campeonatos-disponibles' },
    { icon: 'notifications', label: 'Notificaciones', route: '/lider-equipo/notificaciones' }
  ];
  
  constructor(
    public router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {
    // Usar el servicio de auth
    const user = this.authService.currentUser();
    if (user) {
      this.currentUser.set(user);
    } else {
      // Fallback a localStorage si es necesario
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          this.currentUser.set(parsedUser);
        } catch (error) {
          console.error('Error al parsear usuario:', error);
        }
      }
    }
  }

  toggleSidebar(): void {
    this.isCollapsed.update(v => !v);
  }

  closeSidebar(): void {
    if (window.innerWidth <= 768) {
      this.isCollapsed.set(true);
    }
  }

  onNavigate(): void {
    this.closeSidebar();
  }

  toggleAccessibilityCenter(): void {
    this.showAccessibilityCenter.update(v => !v);
  }

  closeAccessibilityCenter(): void {
    this.showAccessibilityCenter.set(false);
  }

  logout(): void {
    this.showConfirmLogout.set(true);
  }

  confirmLogout(confirmed: boolean): void {
    if (confirmed) {
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    }
    this.showConfirmLogout.set(false);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showAccessibilityCenter()) {
      this.closeAccessibilityCenter();
    }
  }
}