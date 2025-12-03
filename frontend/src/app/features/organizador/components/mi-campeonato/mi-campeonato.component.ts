import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrganizadorService } from '../../services/organizador.service';

@Component({
  selector: 'app-mi-campeonato',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mi-campeonato.component.html',
  styleUrls: ['./mi-campeonato.component.scss']
})
export class MiCampeonatoComponent implements OnInit {
  private organizadorService = inject(OrganizadorService);

  isLoading = signal(true);
  activeTab = signal('informacion');
  campeonato = signal<any>(null);
  showEstadoDropdown = signal(false);

  stats = signal({
    equipos_registrados: 16,
    partidos_totales: 64,
    partidos_jugados: 48,
    goles_totales: 123
  });

  ngOnInit() {
    this.loadCampeonato();
  }

  loadCampeonato() {
    this.isLoading.set(true);
    this.organizadorService.getMiCampeonato().subscribe({
      next: (response) => {
        if (response.campeonatos && response.campeonatos.length > 0) {
          this.campeonato.set(response.campeonatos[0]);
        } else {
          this.campeonato.set({
            id_campeonato: 1,
            nombre: 'Copa de Verano 2024',
            descripcion: 'El torneo de fútbol amateur más emocionante de la temporada. Reúne a los mejores equipos de la región para competir por la gloria.',
            estado: 'en_curso',
            fecha_inicio: '2024-10-01',
            fecha_fin: '2024-12-15'
          });
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.campeonato.set({
          id_campeonato: 1,
          nombre: 'Copa de Verano 2024',
          descripcion: 'El torneo de fútbol amateur más emocionante de la temporada.',
          estado: 'en_curso'
        });
        this.isLoading.set(false);
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
  }

  toggleEstadoDropdown() {
    this.showEstadoDropdown.update(v => !v);
  }

  cambiarEstado(nuevoEstado: string) {
    console.log('Cambiar estado a:', nuevoEstado);
    this.showEstadoDropdown.set(false);
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'planificacion': 'badge-warning',
      'en_curso': 'badge-success',
      'finalizado': 'badge-default'
    };
    return classes[estado] || 'badge-default';
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'planificacion': 'Planificación',
      'en_curso': 'En Juego',
      'finalizado': 'Finalizado'
    };
    return labels[estado] || estado;
  }
}