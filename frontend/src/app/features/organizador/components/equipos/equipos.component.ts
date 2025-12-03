import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; 
import { FormsModule } from '@angular/forms';
import { OrganizadorService } from '../../services/organizador.service';

@Component({
  selector: 'app-equipos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './equipos.component.html',
  styleUrls: ['./equipos.component.scss']
})
export class EquiposComponent implements OnInit {
  private organizadorService = inject(OrganizadorService);

  isLoading = signal(true);
  activeFilter = signal('todos');
  searchTerm = signal('');
  sortBy = signal('fecha');
  viewMode = signal<'grid' | 'list'>('grid');

  equipos = signal<any[]>([]);
  filteredEquipos = signal<any[]>([]);

  equiposPendientes = signal(5);

  ngOnInit() {
    this.loadEquipos();
  }

  loadEquipos() {
    this.isLoading.set(true);
    this.organizadorService.getEquipos().subscribe({
      next: (response) => {
        const data = response.equipos || [];
        this.equipos.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: () => {
        // Mock data
        this.equipos.set([
          {
            id_equipo: 1,
            nombre: 'Leones FC',
            estado: 'aprobado',
            lider: 'Carlos Rodríguez',
            jugadores: 18,
            partidos: 4,
            logo_url: ''
          },
          {
            id_equipo: 2,
            nombre: 'Águilas Reales',
            estado: 'pendiente',
            lider: 'Ana Gómez',
            jugadores: 22,
            partidos: 0,
            logo_url: ''
          },
          {
            id_equipo: 3,
            nombre: 'Tigres del Norte',
            estado: 'aprobado',
            lider: 'Javier Hernández',
            jugadores: 20,
            partidos: 3,
            logo_url: ''
          },
          {
            id_equipo: 4,
            nombre: 'Tiburones Azules',
            estado: 'rechazado',
            lider: 'Sofía Martínez',
            jugadores: 19,
            partidos: 0,
            logo_url: ''
          }
        ]);
        this.applyFilters();
        this.isLoading.set(false);
      }
    });
  }

  setFilter(filter: string) {
    this.activeFilter.set(filter);
    this.applyFilters();
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.applyFilters();
  }

  applyFilters() {
    let filtered = this.equipos();

    // Filter by status
    if (this.activeFilter() !== 'todos') {
      filtered = filtered.filter(e => e.estado === this.activeFilter());
    }

    // Filter by search
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(e => 
        e.nombre.toLowerCase().includes(term) ||
        e.lider.toLowerCase().includes(term)
      );
    }

    this.filteredEquipos.set(filtered);

    // Count pendientes
    const pendientes = this.equipos().filter(e => e.estado === 'pendiente').length;
    this.equiposPendientes.set(pendientes);
  }

  aprobarTodos() {
    console.log('Aprobar todos los equipos pendientes');
  }

  aprobar(equipoId: number) {
    console.log('Aprobar equipo:', equipoId);
  }

  rechazar(equipoId: number) {
    console.log('Rechazar equipo:', equipoId);
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'aprobado': 'badge-success',
      'pendiente': 'badge-warning',
      'rechazado': 'badge-danger'
    };
    return classes[estado] || '';
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'aprobado': 'Aprobado',
      'pendiente': 'Pendiente',
      'rechazado': 'Rechazado'
    };
    return labels[estado] || estado;
  }

  getFilterCount(filter: string): number {
    if (filter === 'todos') return this.equipos().length;
    return this.equipos().filter(e => e.estado === filter).length;
  }
}