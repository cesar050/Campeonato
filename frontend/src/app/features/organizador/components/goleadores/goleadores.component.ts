import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-goleadores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './goleadores.component.html',
  styleUrls: ['./goleadores.component.scss']
})
export class GoleadoresComponent implements OnInit {
  isLoading = signal(true);

  maxGoleador = signal({
    nombre: 'Cristiano Ronaldo',
    goles: 15,
    equipo: 'Al Nassr FC'
  });

  masPenaltis = signal({
    nombre: 'Lionel Messi',
    penaltis: 5,
    equipo: 'Inter Miami CF'
  });

  hatTricks = signal({
    cantidad: 4,
    texto: 'En el torneo'
  });

  goleadores = signal<any[]>([]);

  ngOnInit() {
    this.loadGoleadores();
  }

  loadGoleadores() {
    this.isLoading.set(true);
    // Mock data
    const mockGoleadores = [
      {
        posicion: 1,
        avatar: '',
        nombre: 'Cristiano Ronaldo',
        equipo: 'Al Nassr FC',
        goles: 15,
        penales: 4,
        tiros_libres: 2
      },
      {
        posicion: 2,
        avatar: '',
        nombre: 'Lionel Messi',
        equipo: 'Inter Miami CF',
        goles: 12,
        penales: 5,
        tiros_libres: 3
      },
      {
        posicion: 3,
        avatar: '',
        nombre: 'Kylian Mbappé',
        equipo: 'Paris Saint-Germain',
        goles: 11,
        penales: 2,
        tiros_libres: 1
      },
      {
        posicion: 4,
        avatar: '',
        nombre: 'Erling Haaland',
        equipo: 'Manchester City',
        goles: 10,
        penales: 1,
        tiros_libres: 0
      },
      {
        posicion: 5,
        avatar: '',
        nombre: 'Robert Lewandowski',
        equipo: 'FC Barcelona',
        goles: 9,
        penales: 3,
        tiros_libres: 1
      }
    ];

    this.goleadores.set(mockGoleadores);
    this.isLoading.set(false);
  }

  getMedalClass(posicion: number): string {
    if (posicion === 1) return 'medal-gold';
    if (posicion === 2) return 'medal-silver';
    if (posicion === 3) return 'medal-bronze';
    return '';
  }
}