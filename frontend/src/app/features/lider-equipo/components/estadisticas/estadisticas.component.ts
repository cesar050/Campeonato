import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LiderEquipoService } from '../../services/lider-equipo.service';
import {
  Equipo,
  TablaPosiciones,
  Goleador,
  Asistidor,
  EstadisticasJugador,
  CampeonatoGanado,
  EstadisticasEquipo
} from '../../models/lider-equipo.models';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss']
})
export class EstadisticasComponent implements OnInit {
  loading = signal(true);
  misEquipos = signal<Equipo[]>([]);
  equipoSeleccionado = signal<Equipo | null>(null);
  
  campeonatosInscritos = signal<any[]>([]);
  campeonatoSeleccionado = signal<any>(null);
  
  vistaActiva = signal<'tabla' | 'goleadores' | 'asistencias' | 'jugadores' | 'trofeos'>('tabla');
  
  // Datos de estadísticas
  tablaPosiciones = signal<TablaPosiciones[]>([]);
  goleadores = signal<Goleador[]>([]);
  asistidores = signal<Asistidor[]>([]);
  estadisticasJugadores = signal<EstadisticasJugador[]>([]);
  campeonatosGanados = signal<CampeonatoGanado[]>([]);
  estadisticasEquipo = signal<EstadisticasEquipo | null>(null);

  constructor(private liderService: LiderEquipoService) {}

  ngOnInit(): void {
    this.cargarEquipos();
  }

  cargarEquipos(): void {
    this.loading.set(true);
    this.liderService.obtenerMisEquipos().subscribe({
      next: (response: any) => {
        this.misEquipos.set(response.equipos);
        if (response.equipos.length > 0) {
          this.seleccionarEquipo(response.equipos[0]);
        } else {
          this.loading.set(false);
        }
      },
      error: (error: any) => {
        console.error('Error al cargar equipos:', error);
        this.loading.set(false);
      }
    });
  }

  seleccionarEquipo(equipo: Equipo): void {
    this.equipoSeleccionado.set(equipo);
    this.cargarCampeonatosInscritos(equipo.id_equipo);
    this.cargarCampeonatosGanados(equipo.id_equipo);
  }

  onEquipoChange(idEquipo: string): void {
    const equipo = this.misEquipos().find(e => e.id_equipo === +idEquipo);
    if (equipo) {
      this.seleccionarEquipo(equipo);
    }
  }

  cargarCampeonatosInscritos(idEquipo: number): void {
    this.liderService.obtenerMisCampeonatos(idEquipo).subscribe({
      next: (response: any) => {
        this.campeonatosInscritos.set(response.campeonatos || []);
        if (response.campeonatos && response.campeonatos.length > 0) {
          this.seleccionarCampeonato(response.campeonatos[0]);
        } else {
          this.loading.set(false);
        }
      },
      error: (error: any) => {
        console.error('Error al cargar campeonatos:', error);
        this.loading.set(false);
      }
    });
  }

  seleccionarCampeonato(campeonato: any): void {
    this.campeonatoSeleccionado.set(campeonato);
    this.cargarEstadisticasSegunVista();
  }

  onCampeonatoChange(idCampeonato: string): void {
    const campeonato = this.campeonatosInscritos().find(c => c.id_campeonato === +idCampeonato);
    if (campeonato) {
      this.seleccionarCampeonato(campeonato);
    }
  }

  cambiarVista(vista: 'tabla' | 'goleadores' | 'asistencias' | 'jugadores' | 'trofeos'): void {
    this.vistaActiva.set(vista);
    this.cargarEstadisticasSegunVista();
  }

  cargarEstadisticasSegunVista(): void {
    const vista = this.vistaActiva();
    const equipo = this.equipoSeleccionado();
    const campeonato = this.campeonatoSeleccionado();

    if (!equipo) return;

    this.loading.set(true);

    switch (vista) {
      case 'tabla':
        if (campeonato) {
          this.cargarTablaPosiciones(campeonato.id_campeonato);
        }
        break;
      case 'goleadores':
        this.cargarGoleadores(equipo.id_equipo, campeonato?.id_campeonato);
        break;
      case 'asistencias':
        this.cargarAsistidores(equipo.id_equipo, campeonato?.id_campeonato);
        break;
      case 'jugadores':
        this.cargarEstadisticasJugadores(equipo.id_equipo, campeonato?.id_campeonato);
        break;
      case 'trofeos':
        // Ya están cargados
        this.loading.set(false);
        break;
    }
  }

  cargarTablaPosiciones(idCampeonato: number): void {
    this.liderService.obtenerTablaPosiciones(idCampeonato).subscribe({
      next: (response: any) => {
        this.tablaPosiciones.set(response.tabla || []);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error al cargar tabla:', error);
        this.tablaPosiciones.set([]);
        this.loading.set(false);
      }
    });
  }

  cargarGoleadores(idEquipo: number, idCampeonato?: number): void {
    this.liderService.obtenerGoleadoresEquipo(idEquipo, idCampeonato).subscribe({
      next: (response: any) => {
        this.goleadores.set(response.goleadores || []);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error al cargar goleadores:', error);
        this.goleadores.set([]);
        this.loading.set(false);
      }
    });
  }

  cargarAsistidores(idEquipo: number, idCampeonato?: number): void {
    this.liderService.obtenerAsistidoresEquipo(idEquipo, idCampeonato).subscribe({
      next: (response: any) => {
        this.asistidores.set(response.asistidores || []);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error al cargar asistidores:', error);
        this.asistidores.set([]);
        this.loading.set(false);
      }
    });
  }

  cargarEstadisticasJugadores(idEquipo: number, idCampeonato?: number): void {
    this.liderService.obtenerEstadisticasJugadores(idEquipo, idCampeonato).subscribe({
      next: (response: any) => {
        this.estadisticasJugadores.set(response.estadisticas || []);
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error al cargar estadísticas:', error);
        this.estadisticasJugadores.set([]);
        this.loading.set(false);
      }
    });
  }

  cargarCampeonatosGanados(idEquipo: number): void {
    this.liderService.obtenerCampeonatosGanados(idEquipo).subscribe({
      next: (response: any) => {
        this.campeonatosGanados.set(response.campeonatos || []);
      },
      error: (error: any) => {
        console.error('Error al cargar campeonatos ganados:', error);
        this.campeonatosGanados.set([]);
      }
    });
  }

  getMiPosicion(): TablaPosiciones | null {
    const equipo = this.equipoSeleccionado();
    if (!equipo) return null;
    return this.tablaPosiciones().find(t => t.id_equipo === equipo.id_equipo) || null;
  }

  getClasePosicion(posicion: number): string {
    if (posicion === 1) return 'campeon';
    if (posicion <= 4) return 'clasificado';
    if (posicion >= this.tablaPosiciones().length - 2) return 'descenso';
    return '';
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long'
    });
  }
}