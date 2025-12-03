import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrganizadorService } from '../../services/organizador.service';

@Component({
  selector: 'app-partidos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './partidos.component.html',
  styleUrls: ['./partidos.component.scss']
})
export class PartidosComponent implements OnInit {
  private organizadorService = inject(OrganizadorService);

  isLoading = signal(true);
  activeView = signal('lista');

  partidos = signal<any[]>([]);
  jornadas = signal<any[]>([]);

  ngOnInit() {
    this.loadPartidos();
  }

  loadPartidos() {
    this.isLoading.set(true);
    // Mock data
    const mockPartidos = [
      {
        jornada: 1,
        partidos: [
          {
            id: 1,
            local: 'Halcones FC',
            visitante: 'Tigres del Norte',
            fecha: 'Sábado, 25 de Octubre - 16:00 hs',
            lugar: 'Cancha Principal',
            estado: 'finalizado',
            goles_local: 2,
            goles_visitante: 1
          },
          {
            id: 2,
            local: 'Águilas Reales',
            visitante: 'Lobos FC',
            fecha: 'Sábado, 25 de Octubre - 18:00 hs',
            lugar: 'Cancha Secundaria',
            estado: 'programado',
            goles_local: null,
            goles_visitante: null
          }
        ]
      },
      {
        jornada: 2,
        partidos: [
          {
            id: 3,
            local: 'Tigres del Norte',
            visitante: 'Lobos FC',
            fecha: 'Sábado, 01 de Noviembre - 16:00 hs',
            lugar: 'Cancha Principal',
            estado: 'en_curso',
            goles_local: null,
            goles_visitante: null
          }
        ]
      }
    ];

    this.jornadas.set(mockPartidos);
    this.isLoading.set(false);
  }

  setView(view: string) {
    this.activeView.set(view);
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'programado': 'badge-warning',
      'en_curso': 'badge-info',
      'finalizado': 'badge-danger'
    };
    return classes[estado] || '';
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'programado': 'Programado',
      'en_curso': 'En Curso',
      'finalizado': 'Finalizado'
    };
    return labels[estado] || estado;
  }
}