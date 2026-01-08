import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SuperadminService } from '../../services/superadmin.service';

interface Campeonato {
  id_campeonato: number;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'planificacion' | 'en_curso' | 'finalizado';
  equipos_count: number;
  partidos_count: number;
  organizador_nombre: string;
  organizador_id: number;
}

@Component({
  selector: 'app-campeonatos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './campeonatos.component.html',
  styleUrls: ['./campeonatos.component.scss']
})
export class CampeonatosComponent implements OnInit {
  private superadminService = inject(SuperadminService);

  isLoading = signal(true);
  campeonatos = signal<Campeonato[]>([]);
  filteredCampeonatos = signal<Campeonato[]>([]);
  
  searchTerm = signal('');
  filterEstado = signal('Todos');

  estadisticas = signal({
    total: 0,
    planificacion: 0,
    en_curso: 0,
    finalizados: 0
  });

  ngOnInit() {
    this.loadCampeonatos();
  }

  loadCampeonatos() {
    this.isLoading.set(true);
    this.superadminService.getCampeonatos().subscribe({
      next: (response) => {
        this.campeonatos.set(response.campeonatos || []);
        this.calcularEstadisticas();
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading campeonatos:', err);
        this.isLoading.set(false);
      }
    });
  }

  calcularEstadisticas() {
    const camps = this.campeonatos();
    this.estadisticas.set({
      total: camps.length,
      planificacion: camps.filter(c => c.estado === 'planificacion').length,
      en_curso: camps.filter(c => c.estado === 'en_curso').length,
      finalizados: camps.filter(c => c.estado === 'finalizado').length
    });
  }

  applyFilters() {
    let filtered = this.campeonatos();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(camp => 
        camp.nombre.toLowerCase().includes(term) ||
        camp.organizador_nombre.toLowerCase().includes(term)
      );
    }

    if (this.filterEstado() !== 'Todos') {
      const estado = this.filterEstado().toLowerCase();
      filtered = filtered.filter(camp => camp.estado === estado);
    }

    this.filteredCampeonatos.set(filtered);
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.applyFilters();
  }

  onEstadoChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterEstado.set(select.value);
    this.applyFilters();
  }

  getEstadoClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'planificacion': 'estado-planificacion',
      'en_curso': 'estado-en-curso',
      'finalizado': 'estado-finalizado'
    };
    return classes[estado] || '';
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'planificacion': 'Planificacion',
      'en_curso': 'En Curso',
      'finalizado': 'Finalizado'
    };
    return labels[estado] || estado;
  }
}