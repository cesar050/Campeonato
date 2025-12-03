import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-organizador-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  menuItems = [
    { icon: 'grid', label: 'Dashboard', route: '/organizador/dashboard' },
    { icon: 'trophy', label: 'Mi Campeonato', route: '/organizador/mi-campeonato' },
    { icon: 'users', label: 'Equipos', route: '/organizador/equipos' },
    { icon: 'calendar', label: 'Partidos', route: '/organizador/partidos' },
    { icon: 'bar-chart', label: 'Tabla de Posiciones', route: '/organizador/tabla-posiciones' },
    { icon: 'trending-up', label: 'Estadísticas', route: '/organizador/estadisticas' }
  ];

  logout() {
    console.log('🚪 Logout organizador');
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}