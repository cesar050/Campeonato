import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AccessibilityCenterComponent } from '../../../../shared/components/accessibility-center/accessibility-center.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-organizador-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, AccessibilityCenterComponent, ConfirmDialogComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private authService = inject(AuthService);
  router = inject(Router); // Exponer para uso en template

  currentUser = this.authService.currentUser;
  isCollapsed = signal(false);
  showAccessibilityCenter = signal(false);
  showConfirmLogout = signal(false);

  menuItems = [
    { icon: 'dashboard', label: 'Información General', route: '/organizador/dashboard' },
    { icon: 'emoji_events', label: 'Mi Campeonato', route: '/organizador/mi-campeonato' },
    { icon: 'groups', label: 'Equipos', route: '/organizador/equipos' },
    { icon: 'sports_soccer', label: 'Partidos', route: '/organizador/partidos' },
    { icon: 'leaderboard', label: 'Tabla de Posiciones', route: '/organizador/tabla-posiciones' },
    { icon: 'trending_up', label: 'Estadísticas', route: '/organizador/estadisticas' }
  ];

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

  // Manejo de teclado para cerrar modal con Escape
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showAccessibilityCenter()) {
      this.closeAccessibilityCenter();
    }
  }
}