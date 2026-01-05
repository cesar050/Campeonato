import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-superadmin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private router = inject(Router);

  isCollapsed = signal(false);
  currentUser = signal({ nombre: 'Admin User' });

  menuItems: MenuItem[] = [
    { label: 'Dashboard', route: '/superadmin/dashboard', icon: 'grid' },
    { label: 'Campeonatos', route: '/superadmin/campeonatos', icon: 'trophy' },
    { label: 'Organizadores', route: '/superadmin/organizadores', icon: 'users' },
    { label: 'Usuarios', route: '/superadmin/usuarios', icon: 'user' },
    { label: 'Analiticas', route: '/superadmin/analytics', icon: 'bar-chart' },
    { label: 'Configuracion', route: '/superadmin/configuracion', icon: 'settings' }
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

  logout() {
    localStorage.removeItem('access_token');
    this.router.navigate(['/auth/login']);
  }
}