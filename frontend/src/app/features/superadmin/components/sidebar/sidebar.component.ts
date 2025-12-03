import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-superadmin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  isCollapsed = signal(false);
  private isMobile = signal(false);

  menuItems = [
    {
      icon: 'grid',
      label: 'Dashboard',
      route: '/superadmin/dashboard'
    },
    {
      icon: 'trophy',
      label: 'Campeonatos',
      route: '/superadmin/campeonatos'
    },
    {
      icon: 'users',
      label: 'Organizadores',
      route: '/superadmin/organizadores'
    },
    {
      icon: 'user',
      label: 'Usuarios',
      route: '/superadmin/usuarios'
    },
    {
      icon: 'bar-chart',
      label: 'Analíticas',
      route: '/superadmin/analytics'
    },
    {
      icon: 'settings',
      label: 'Configuración',
      route: '/superadmin/configuracion'
    }
  ];

  constructor() {
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    const wasMobile = this.isMobile();
    this.isMobile.set(window.innerWidth <= 768);
    
    // Si cambiamos de móvil a escritorio, mostrar sidebar
    if (wasMobile && !this.isMobile()) {
      this.isCollapsed.set(false);
    }
    // Si cambiamos a móvil, ocultar sidebar
    if (!wasMobile && this.isMobile()) {
      this.isCollapsed.set(true);
    }
  }

  toggleSidebar() {
    this.isCollapsed.update(value => !value);
  }

  closeSidebar() {
    if (this.isMobile()) {
      this.isCollapsed.set(true);
    }
  }

  onNavigate() {
    // Cerrar sidebar en móvil después de navegar
    if (this.isMobile()) {
      this.isCollapsed.set(true);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}