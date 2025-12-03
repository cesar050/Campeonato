import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss']
})
export class EstadisticasComponent {
  masAmarillas = signal([
    { nombre: 'Carlos Rodríguez', equipo: 'Águilas FC', amarillas: 8 },
    { nombre: 'Javier Hernández', equipo: 'Tigres del Norte', amarillas: 7 },
    { nombre: 'Andrés Gutiérrez', equipo: 'Deportivo Sol', amarillas: 6 }
  ]);

  masRojas = signal([
    { nombre: 'Martín Sánchez', equipo: 'Halcones Rojos', rojas: 3 },
    { nombre: 'Ricardo Peña', equipo: 'Tigres del Norte', rojas: 2 }
  ]);

  disciplinaPorEquipo = signal([
    { equipo: 'Unión Central', badge: 'Equipo Más Limpio', amarillas: 15, rojas: 0, total: 15 },
    { equipo: 'Deportivo Sol', amarillas: 18, rojas: 1, total: 19 },
    { equipo: 'Águilas FC', amarillas: 22, rojas: 1, total: 23 },
    { equipo: 'Tigres del Norte', amarillas: 25, rojas: 2, total: 27 },
    { equipo: 'Halcones Rojos', amarillas: 24, rojas: 3, total: 27 }
  ]);

  tarjetasPorJornada = signal([
    { jornada: 1, amarillas: 12, rojas: 0 },
    { jornada: 2, amarillas: 18, rojas: 1 },
    { jornada: 3, amarillas: 15, rojas: 2 },
    { jornada: 4, amarillas: 22, rojas: 1 },
    { jornada: 5, amarillas: 16, rojas: 0 }
  ]);

  getMaxValue(data: any[]): number {
    return Math.max(...data.map(d => Math.max(d.amarillas || 0, d.rojas || 0)));
  }

  getBarHeight(value: number, max: number): number {
    return (value / max) * 100;
  }
}