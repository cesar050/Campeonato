import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SuperadminService } from '../../services/superadmin.service';

interface Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  email_verified: boolean;
  fecha_registro: string;
  campeonato_nombre?: string;
  equipo_nombre?: string;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit {
  private superadminService = inject(SuperadminService);

  isLoading = signal(true);
  usuarios = signal<Usuario[]>([]);
  filteredUsuarios = signal<Usuario[]>([]);

  searchTerm = signal('');
  filterRol = signal('Todos');
  filterEstado = signal('Todos');

  estadisticas = signal({
    total: 0,
    organizadores: 0,
    lideres: 0,
    espectadores: 0,
    activos: 0
  });

  ngOnInit() {
    this.loadUsuarios();
  }

  loadUsuarios() {
    this.isLoading.set(true);
    this.superadminService.getUsuarios().subscribe({
      next: (response) => {
        this.usuarios.set(response.usuarios || []);
        this.calcularEstadisticas();
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading usuarios:', err);
        this.isLoading.set(false);
      }
    });
  }

  calcularEstadisticas() {
    const users = this.usuarios();
    this.estadisticas.set({
      total: users.length,
      organizadores: users.filter(u => u.rol === 'admin').length,
      lideres: users.filter(u => u.rol === 'lider').length,
      espectadores: users.filter(u => u.rol === 'espectador').length,
      activos: users.filter(u => u.activo).length
    });
  }

  applyFilters() {
    let filtered = this.usuarios();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(user => 
        user.nombre.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    }

    if (this.filterRol() !== 'Todos') {
      const rol = this.filterRol().toLowerCase();
      filtered = filtered.filter(user => user.rol === rol);
    }

    if (this.filterEstado() !== 'Todos') {
      const isActive = this.filterEstado() === 'Activo';
      filtered = filtered.filter(user => user.activo === isActive);
    }

    this.filteredUsuarios.set(filtered);
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.applyFilters();
  }

  onRolChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterRol.set(select.value);
    this.applyFilters();
  }

  onEstadoChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterEstado.set(select.value);
    this.applyFilters();
  }

  getRolBadgeClass(rol: string): string {
    const classes: { [key: string]: string } = {
      'admin': 'rol-admin',
      'lider': 'rol-lider',
      'espectador': 'rol-espectador'
    };
    return classes[rol] || '';
  }

  getRolLabel(rol: string): string {
    const labels: { [key: string]: string } = {
      'admin': 'Organizador',
      'lider': 'Lider',
      'espectador': 'Espectador'
    };
    return labels[rol] || rol;
  }
}