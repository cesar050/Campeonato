import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrganizadorService } from '../../services/organizador.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private organizadorService = inject(OrganizadorService);

  isLoading = signal(true);
  campeonato = signal<any>(null);
  stats = signal({
    equipos_inscritos: 16,
    equipos_pendientes: 2,
    partidos_programados: 32,
    proximo_partido_dias: 2
  });

  proximosPartidos = signal([
    {
      id: 1,
      local: 'Real Sociedad',
      visitante: 'Atlético de Madrid',
      fecha: '25 de Octubre, 20:00',
      lugar: 'Estadio Principal'
    },
    {
      id: 2,
      local: 'FC Barcelona',
      visitante: 'Real Madrid',
      fecha: '26 de Octubre, 16:00',
      lugar: 'Camp Nou'
    },
    {
      id: 3,
      local: 'Valencia CF',
      visitante: 'Sevilla FC',
      fecha: '27 de Octubre, 18:00',
      lugar: 'Mestalla'
    }
  ]);

  solicitudesPendientes = signal([
    { id: 1, equipo: 'Los Leones FC', logo_url: '' },
    { id: 2, equipo: 'Águilas Doradas', logo_url: '' }
  ]);

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.isLoading.set(true);
    this.organizadorService.getMiCampeonato().subscribe({
      next: (response) => {
        if (response.campeonatos && response.campeonatos.length > 0) {
          this.campeonato.set(response.campeonatos[0]);
        } else {
          this.campeonato.set({
            nombre: 'Copa Verde 2024',
            estado: 'en_curso'
          });
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.campeonato.set({
          nombre: 'Copa Verde 2024',
          estado: 'en_curso'
        });
        this.isLoading.set(false);
      }
    });
  }

  aprobarEquipo(equipoId: number) {
    console.log('Aprobar:', equipoId);
  }

  rechazarEquipo(equipoId: number) {
    console.log('Rechazar:', equipoId);
  }
}