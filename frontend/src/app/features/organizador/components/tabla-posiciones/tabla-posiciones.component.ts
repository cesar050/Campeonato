import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tabla-posiciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tabla-posiciones.component.html',
  styleUrls: ['./tabla-posiciones.component.scss']
})
export class TablaPosicionesComponent implements OnInit {
  isLoading = signal(true);
  selectedJornada = signal('Jornada 12');
  selectedDate = signal('08/14/2024');

  equipos = signal<any[]>([]);

  ngOnInit() {
    this.loadTabla();
  }

  loadTabla() {
    this.isLoading.set(true);
    // Mock data
    const mockEquipos = [
      {
        posicion: 1,
        nombre: 'FC Barcelona',
        logo_url: '',
        cambio: 'up',
        pj: 12,
        pg: 10,
        pe: 1,
        pp: 1,
        gf: 35,
        gc: 10,
        dif: 25,
        pts: 31,
        forma: ['G', 'G', 'G', 'E', 'G']
      },
      {
        posicion: 2,
        nombre: 'Real Madrid',
        logo_url: '',
        cambio: 'none',
        pj: 12,
        pg: 9,
        pe: 2,
        pp: 1,
        gf: 28,
        gc: 8,
        dif: 20,
        pts: 29,
        forma: ['G', 'G', 'P', 'G', 'G']
      },
      {
        posicion: 3,
        nombre: 'Atlético de Madrid',
        logo_url: '',
        cambio: 'down',
        pj: 12,
        pg: 8,
        pe: 1,
        pp: 3,
        gf: 22,
        gc: 15,
        dif: 7,
        pts: 25,
        forma: ['P', 'G', 'G', 'G', 'P']
      },
      {
        posicion: 18,
        nombre: 'Sevilla FC',
        logo_url: '',
        cambio: 'none',
        pj: 12,
        pg: 2,
        pe: 3,
        pp: 7,
        gf: 10,
        gc: 21,
        dif: -11,
        pts: 9,
        forma: ['E', 'P', 'P', 'G', 'P']
      },
      {
        posicion: 19,
        nombre: 'Celta de Vigo',
        logo_url: '',
        cambio: 'up',
        pj: 12,
        pg: 1,
        pe: 4,
        pp: 7,
        gf: 12,
        gc: 25,
        dif: -13,
        pts: 7,
        forma: ['P', 'E', 'E', 'P', 'G']
      }
    ];

    this.equipos.set(mockEquipos);
    this.isLoading.set(false);
  }

  getZonaClass(posicion: number): string {
    if (posicion <= 4) return 'zona-champions';
    if (posicion <= 6) return 'zona-europa';
    if (posicion >= 18) return 'zona-descenso';
    return '';
  }

  getFormaClass(resultado: string): string {
    const classes: { [key: string]: string } = {
      'G': 'forma-win',
      'E': 'forma-draw',
      'P': 'forma-loss'
    };
    return classes[resultado] || '';
  }

  getCambioIcon(cambio: string) {
    if (cambio === 'up') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>`;
    }
    if (cambio === 'down') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>`;
    }
    return '-';
  }

  descargarPDF() {
    console.log('Descargar PDF');
  }

  descargarExcel() {
    console.log('Descargar Excel');
  }

  compartirEnlace() {
    console.log('Compartir enlace');
  }
}