import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';

interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: string;
}

@Component({
  selector: 'app-lider-equipo',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './lider-equipo.component.html',
  styleUrls: ['./lider-equipo.component.scss']
})
export class LiderEquipoComponent implements OnInit {
  isSidebarCollapsed = signal(false);
  currentUser = signal<Usuario | null>(null);

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser.set(user);
      } catch (error) {
        console.error('Error al parsear usuario:', error);
      }
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(v => !v);
  }

  logout(): void {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.router.navigate(['/auth/login']);
    }
  }
}