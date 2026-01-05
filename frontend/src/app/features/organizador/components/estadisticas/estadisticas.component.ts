import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizadorService, Campeonato } from '../../services/organizador.service';

interface JugadorDisciplina {
  id_jugador: number;
  nombre: string;
  equipo: string;
  amarillas?: number;
  rojas?: number;
}

interface EquipoDisciplina {
  id_equipo: number;
  equipo: string;
  amarillas: number;
  rojas: number;
  total: number;
  badge?: string;
}

interface TarjetasJornada {
  jornada: number;
  amarillas: number;
  rojas: number;
}

interface EstadisticasDisciplina {
  campeonato: any;
  top_amarillas: JugadorDisciplina[];
  top_rojas: JugadorDisciplina[];
  disciplina_equipos: EquipoDisciplina[];
  tarjetas_jornada: TarjetasJornada[];
  totales: {
    amarillas: number;
    rojas: number;
    total: number;
  };
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss']
})
export class EstadisticasComponent implements OnInit {
  // Estados
  loading = signal(false);
  misCampeonatos = signal<Campeonato[]>([]);
  campeonatoSeleccionado = signal<number | null>(null);
  
  // Datos de disciplina
  masAmarillas = signal<JugadorDisciplina[]>([]);
  masRojas = signal<JugadorDisciplina[]>([]);
  disciplinaPorEquipo = signal<EquipoDisciplina[]>([]);
  tarjetasPorJornada = signal<TarjetasJornada[]>([]);
  totales = signal({ amarillas: 0, rojas: 0, total: 0 });

  // Computed
  hayDatos = computed(() => {
    return this.masAmarillas().length > 0 || 
           this.masRojas().length > 0 || 
           this.disciplinaPorEquipo().length > 0;
  });

  constructor(private organizadorService: OrganizadorService) {}

  ngOnInit(): void {
    this.cargarMisCampeonatos();
  }

  cargarMisCampeonatos(): void {
    this.organizadorService.obtenerMisCampeonatos().subscribe({
      next: (campeonatos) => {
        this.misCampeonatos.set(campeonatos);
        if (campeonatos.length > 0) {
          this.campeonatoSeleccionado.set(campeonatos[0].id_campeonato);
          this.cargarEstadisticas();
        }
      },
      error: (error) => {
        console.error('Error al cargar campeonatos:', error);
      }
    });
  }

  cargarEstadisticas(): void {
    const campeonatoId = this.campeonatoSeleccionado();
    if (!campeonatoId) return;

    this.loading.set(true);

    this.organizadorService.obtenerEstadisticasDisciplina(campeonatoId).subscribe({
      next: (response: EstadisticasDisciplina) => {
        console.log('📊 Estadísticas recibidas:', response);
        
        this.masAmarillas.set(response.top_amarillas || []);
        this.masRojas.set(response.top_rojas || []);
        this.disciplinaPorEquipo.set(response.disciplina_equipos || []);
        this.tarjetasPorJornada.set(response.tarjetas_jornada || []);
        this.totales.set(response.totales || { amarillas: 0, rojas: 0, total: 0 });
        
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('❌ Error al cargar estadísticas:', error);
        this.loading.set(false);
      }
    });
  }

  cambiarCampeonato(): void {
    this.cargarEstadisticas();
  }

  exportar(): void {
    console.log('🔄 Exportar estadísticas (próximamente)');
  }

  // Utilidades para gráficas
  getMaxValue(data: TarjetasJornada[]): number {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => Math.max(d.amarillas || 0, d.rojas || 0)));
  }

  getBarHeight(value: number, max: number): number {
    if (max === 0) return 0;
    return (value / max) * 100;
  }
}