import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AccessibilityCenterComponent } from '../../../../shared/components/accessibility-center/accessibility-center.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-superadmin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, AccessibilityCenterComponent, ConfirmDialogComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  router = inject(Router);
  private authService = inject(AuthService);

  isCollapsed = signal(false);
  showAccessibilityCenter = signal(false);
  showConfirmDialog = signal(false);
  currentUser = this.authService.currentUser;
  

  menuItems: MenuItem[] = [
    { label: 'Dashboard', route: '/superadmin/dashboard', icon: 'dashboard' },
    { label: 'Campeonatos', route: '/superadmin/campeonatos', icon: 'emoji_events' },
    { label: 'Organizadores', route: '/superadmin/organizadores', icon: 'groups' },
    { label: 'Usuarios', route: '/superadmin/usuarios', icon: 'person' },
    { label: 'Analíticas', route: '/superadmin/analytics', icon: 'bar_chart' },
    { label: 'Configuración', route: '/superadmin/configuracion', icon: 'settings' }
  ];

  toggleSidebar() {
    this.isCollapsed.update(v => !v);
  }

  closeSidebar() {
    if (window.innerWidth <= 768) {
      this.isCollapsed.set(true);
    }
  }

  onNavigate() {
    this.closeSidebar();
  }

  toggleAccessibilityCenter(): void {
    this.showAccessibilityCenter.update(v => !v);
  }

  closeAccessibilityCenter(): void {
    this.showAccessibilityCenter.set(false);
  }

  logout(): void {
    this.showConfirmDialog.set(true);
  }

  confirmLogout(confirmed: boolean): void {
    if (confirmed) {
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    }
    this.showConfirmDialog.set(false);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.showAccessibilityCenter()) {
        this.closeAccessibilityCenter();
      }
      if (this.showConfirmDialog()) {
        this.showConfirmDialog.set(false);
      }
    }
  }
}