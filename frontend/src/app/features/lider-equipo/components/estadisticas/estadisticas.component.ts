import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
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

import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ImagePlaceholderComponent],
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
  
  // Equipos inscritos para logos
  equiposInscritos = signal<any[]>([]);

  constructor(
    private liderService: LiderEquipoService,
    private http: HttpClient
  ) {}

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
    // Los campeonatos ya vienen en la respuesta de obtenerMisEquipos
    const campeonatosDelEquipo = (equipo as any).campeonatos || [];
    // Filtrar solo los campeonatos aprobados
    const campeonatosAprobados = campeonatosDelEquipo
      .filter((c: any) => c.estado_inscripcion === 'aprobado')
      .map((c: any) => ({
        id_campeonato: c.id_campeonato,
        nombre: c.nombre_campeonato,
        estado_inscripcion: c.estado_inscripcion
      }));
    
    this.campeonatosInscritos.set(campeonatosAprobados);
    
    if (campeonatosAprobados.length > 0) {
      this.seleccionarCampeonato(campeonatosAprobados[0]);
    } else {
      this.loading.set(false);
    }
    
    // Los campeonatos ganados no son críticos, así que los intentamos cargar pero no bloqueamos
    this.cargarCampeonatosGanados(equipo.id_equipo);
  }

  onEquipoChange(idEquipo: string): void {
    const equipo = this.misEquipos().find(e => e.id_equipo === +idEquipo);
    if (equipo) {
      // Cargar el equipo completo con sus campeonatos
      this.liderService.obtenerMisEquipos().subscribe({
        next: (response: any) => {
          const equipoCompleto = response.equipos.find((e: any) => e.id_equipo === +idEquipo);
          if (equipoCompleto) {
            this.seleccionarEquipo(equipoCompleto);
          }
        },
        error: (error: any) => {
          console.error('Error al cargar equipo:', error);
          // Si falla, usar el equipo que ya tenemos en memoria
          this.seleccionarEquipo(equipo);
        }
      });
    }
  }

  // Este método ya no es necesario, los campeonatos vienen en obtenerMisEquipos()
  // Se mantiene por compatibilidad pero no se usa

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

    if (!equipo) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    switch (vista) {
      case 'tabla':
        if (campeonato) {
          this.cargarTablaPosiciones(campeonato.id_campeonato);
        } else {
          // No hay campeonato seleccionado
          this.tablaPosiciones.set([]);
          this.loading.set(false);
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
        // Ya están cargados en seleccionarEquipo
        this.loading.set(false);
        break;
    }
  }

  cargarTablaPosiciones(idCampeonato: number): void {
    console.log('🏆 Cargando tabla de posiciones para campeonato:', idCampeonato);
    // Cargar equipos inscritos PRIMERO para tener logos disponibles
    this.cargarEquiposInscritos(idCampeonato);
    
    // Usar la ruta correcta del backend: /estadisticas/tabla-posiciones?id_campeonato=X
    const params = new HttpParams().set('id_campeonato', idCampeonato.toString());
    this.http.get('http://localhost:5000/estadisticas/tabla-posiciones', { params }).subscribe({
      next: (response: any) => {
        console.log('📊 Respuesta tabla de posiciones:', response);
        // Manejar diferentes formatos de respuesta
        const tabla = response.tabla_posiciones || response.tabla || response.data || response || [];
        console.log('📊 Tabla procesada:', tabla);
        this.tablaPosiciones.set(Array.isArray(tabla) ? tabla : []);
        // Si la tabla no viene con logos, asegurar que estén cargados los equipos
        if (this.equiposInscritos().length === 0) {
          this.cargarEquiposInscritos(idCampeonato);
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('❌ Error al cargar tabla:', error);
        this.tablaPosiciones.set([]);
        this.loading.set(false);
      }
    });
  }
  
  cargarEquiposInscritos(idCampeonato: number): void {
    this.liderService.obtenerInscripcionesPorCampeonato(idCampeonato).subscribe({
      next: (response: any) => {
        const inscripciones = response.inscripciones || response || [];
        const aprobadas = inscripciones.filter((i: any) => i.estado_inscripcion === 'aprobado');
        
        const equipos: any[] = aprobadas
          .filter((i: any) => i.equipo)
          .map((i: any) => i.equipo);
        
        // Merge con equipos existentes
        const equiposExistentes = this.equiposInscritos();
        const equiposMap = new Map<number, any>();
        
        equiposExistentes.forEach(e => equiposMap.set(e.id_equipo, e));
        equipos.forEach(e => equiposMap.set(e.id_equipo, e));
        
        this.equiposInscritos.set(Array.from(equiposMap.values()));
      },
      error: (error: any) => {
        console.error('Error al cargar equipos inscritos:', error);
      }
    });
  }
  
  obtenerLogoEquipo(idEquipo: number): string | null {
    if (!idEquipo) return null;
    const equipo = this.equiposInscritos().find(e => e.id_equipo === idEquipo);
    return equipo?.logo_url || null;
  }

  cargarGoleadores(idEquipo: number, idCampeonato?: number): void {
    this.liderService.obtenerGoleadoresEquipo(idEquipo, idCampeonato).subscribe({
      next: (response: any) => {
        this.goleadores.set(response.goleadores || response || []);
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
        this.asistidores.set(response.asistidores || response || []);
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
        this.estadisticasJugadores.set(response.estadisticas || response || []);
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
    // Esta funcionalidad no está implementada en el backend todavía
    // Por ahora simplemente inicializamos vacío
    this.campeonatosGanados.set([]);
    // TODO: Implementar cuando el backend tenga este endpoint
    // this.liderService.obtenerCampeonatosGanados(idEquipo).subscribe({
    //   next: (response: any) => {
    //     this.campeonatosGanados.set(response.campeonatos || []);
    //   },
    //   error: (error: any) => {
    //     console.error('Error al cargar campeonatos ganados:', error);
    //     this.campeonatosGanados.set([]);
    //   }
    // });
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