import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LiderEquipoService } from '../../services/lider-equipo.service';
import { Equipo, Partido } from '../../models/lider-equipo.models';
import { ImagePlaceholderComponent } from '../../../../shared/components/image-placeholder/image-placeholder.component';

interface CampeonatoConEquipo {
  id_campeonato: number;
  nombre_campeonato: string;
  id_equipo: number;
  nombre_equipo: string;
}

@Component({
  selector: 'app-partidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ImagePlaceholderComponent],
  templateUrl: './partidos.component.html',
  styleUrls: ['./partidos.component.scss']
})
export class PartidosComponent implements OnInit {
  // Estados
  loading = signal(true);
  vistaActual = signal<'lista' | 'calendario'>('lista');

  // Datos
  misEquipos = signal<Equipo[]>([]);
  campeonatosDisponibles = signal<CampeonatoConEquipo[]>([]);
  campeonatoSeleccionado = signal<CampeonatoConEquipo | null>(null);
  todosLosPartidos = signal<Partido[]>([]);
  equiposInscritos = signal<Equipo[]>([]);
  
  // Paginación por FECHAS
  fechaActual = signal<string | null>(null);
  
  // Filtros
  estadoFilter = signal<string>('');
  mesActual = signal(new Date());

  // Para el template
  Math = Math;

  // Agrupar partidos por fecha
  partidosPorFecha = computed(() => {
    const partidos = this.todosLosPartidos();
    const grupos = new Map<string, Partido[]>();

    partidos.forEach(p => {
      const fecha = p.fecha_partido.split('T')[0];
      if (!grupos.has(fecha)) {
        grupos.set(fecha, []);
      }
      grupos.get(fecha)!.push(p);
    });

    return Array.from(grupos.entries())
      .map(([fecha, partidos]) => ({ fecha, partidos }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  });

  // Fechas disponibles
  fechasDisponibles = computed(() => {
    return this.partidosPorFecha().map(g => g.fecha);
  });

  // Partidos de la fecha actual
  partidosFechaActual = computed(() => {
    const fecha = this.fechaActual();
    if (!fecha) return [];
    
    const grupo = this.partidosPorFecha().find(g => g.fecha === fecha);
    if (!grupo) return [];
    
    let partidos = grupo.partidos;
    
    const filtro = this.estadoFilter();
    if (filtro) {
      partidos = partidos.filter(p => p.estado === filtro);
    }
    
    return partidos.sort((a, b) => {
      const horaA = new Date(a.fecha_partido).getTime();
      const horaB = new Date(b.fecha_partido).getTime();
      return horaA - horaB;
    });
  });

  // Partidos del mes actual (para calendario)
  partidosDelMes = computed(() => {
    const mes = this.mesActual();
    return this.todosLosPartidos().filter(p => {
      const fechaPartido = new Date(p.fecha_partido);
      return fechaPartido.getMonth() === mes.getMonth() &&
             fechaPartido.getFullYear() === mes.getFullYear();
    });
  });

  // Estadísticas
  estadisticas = computed(() => {
    const partidos = this.todosLosPartidos();
    const finalizados = partidos.filter(p => p.estado === 'finalizado');
    
    let ganados = 0;
    let empatados = 0;
    let perdidos = 0;

    finalizados.forEach(p => {
      if (p.es_local) {
        if (p.goles_local > p.goles_visitante) ganados++;
        else if (p.goles_local < p.goles_visitante) perdidos++;
        else empatados++;
      } else {
        if (p.goles_visitante > p.goles_local) ganados++;
        else if (p.goles_visitante < p.goles_local) perdidos++;
        else empatados++;
      }
    });

    return {
      total: partidos.length,
      programados: partidos.filter(p => p.estado === 'programado').length,
      finalizados: finalizados.length,
      ganados,
      empatados,
      perdidos
    };
  });

  constructor(
    private liderService: LiderEquipoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarEquiposYCampeonatos();
  }

  cargarEquiposYCampeonatos(): void {
    this.loading.set(true);

    this.liderService.obtenerMisEquipos().subscribe({
      next: (response) => {
        this.misEquipos.set(response.equipos);
        
        const campeonatos: CampeonatoConEquipo[] = [];
        
        response.equipos.forEach(equipo => {
          if (equipo.campeonatos && equipo.campeonatos.length > 0) {
            equipo.campeonatos.forEach(camp => {
              if (camp.estado_inscripcion === 'aprobado') {
                campeonatos.push({
                  id_campeonato: camp.id_campeonato,
                  nombre_campeonato: camp.nombre_campeonato,
                  id_equipo: equipo.id_equipo,
                  nombre_equipo: equipo.nombre
                });
              }
            });
          }
        });

        this.campeonatosDisponibles.set(campeonatos);
        
        if (campeonatos.length > 0) {
          this.campeonatoSeleccionado.set(campeonatos[0]);
          this.cargarPartidos(campeonatos[0]);
        } else {
          this.loading.set(false);
        }
      },
      error: (error) => {
        console.error('Error al cargar equipos:', error);
        this.loading.set(false);
      }
    });
  }

  cargarPartidos(campeonato: CampeonatoConEquipo): void {
    this.loading.set(true);

    // PRIMERO cargar partidos
    this.liderService.obtenerPartidos(campeonato.id_equipo, {
      per_page: 1000,
      estado: this.estadoFilter() || undefined
    }).subscribe({
      next: (response) => {
        console.log('📥 [PARTIDOS] Respuesta completa del backend:', response);
        
        const partidosCampeonato = (response.partidos || []).filter(
          p => p.campeonato === campeonato.nombre_campeonato
        );
        
        console.log('🔍 [PARTIDOS] Partidos del campeonato:', partidosCampeonato);
        if (partidosCampeonato.length > 0) {
          console.log('🔍 [PARTIDOS] Primer partido completo (JSON):', JSON.stringify(partidosCampeonato[0], null, 2));
          console.log('🔍 [PARTIDOS] ¿Tiene id_equipo_local?', 'id_equipo_local' in partidosCampeonato[0]);
          console.log('🔍 [PARTIDOS] ¿Tiene id_equipo_visitante?', 'id_equipo_visitante' in partidosCampeonato[0]);
          console.log('🔍 [PARTIDOS] id_equipo_local valor:', partidosCampeonato[0].id_equipo_local);
          console.log('🔍 [PARTIDOS] id_equipo_visitante valor:', partidosCampeonato[0].id_equipo_visitante);
        }
        
        // Obtener campeonatos únicos de los partidos
        const campeonatosUnicos = new Set<number>();
        
        // Primero intentar obtener id_campeonato de los partidos
        partidosCampeonato.forEach(p => {
          if (p.id_campeonato && typeof p.id_campeonato === 'number') {
            campeonatosUnicos.add(p.id_campeonato);
          }
        });
        
        // Si no hay ids de campeonato en los partidos, usar el campeonato actual
        if (campeonatosUnicos.size === 0) {
          console.warn('⚠️ [PARTIDOS] No se encontró id_campeonato en los partidos, usando campeonato actual');
          campeonatosUnicos.add(campeonato.id_campeonato);
        } else {
          // También agregar el campeonato actual por si acaso
          campeonatosUnicos.add(campeonato.id_campeonato);
        }
        
        console.log('🏆 [PARTIDOS] Campeonatos únicos encontrados:', Array.from(campeonatosUnicos));
        console.log('📋 [PARTIDOS] Partidos encontrados:', partidosCampeonato.length);
        
        // Cargar equipos de TODOS los campeonatos únicos usando Promise.all
        const promesasCarga = Array.from(campeonatosUnicos).map(campId => {
          return new Promise<void>((resolve) => {
            this.cargarEquiposInscritos(campId, () => {
              resolve();
            });
          });
        });
        
        // Esperar a que TODOS los equipos se carguen antes de mostrar partidos
        Promise.all(promesasCarga).then(() => {
          console.log('✅ [PARTIDOS] TODOS los equipos cargados:', this.equiposInscritos().length);
          console.log('📋 [PARTIDOS] Equipos disponibles:', this.equiposInscritos().map(e => ({
            id: e.id_equipo,
            nombre: e.nombre,
            logo: e.logo_url || 'SIN LOGO'
          })));
          
          // Si los partidos NO tienen id_equipo_local/id_equipo_visitante, buscarlos por nombre
          partidosCampeonato.forEach((p: any) => {
            // Si no tiene los IDs, buscarlos por nombre de equipo
            if (!p.id_equipo_local && p.equipo_local) {
              const equipoLocal = this.equiposInscritos().find(e => e.nombre === p.equipo_local);
              if (equipoLocal) {
                p.id_equipo_local = equipoLocal.id_equipo;
                console.log(`✅ [PARTIDOS] Encontrado ID para equipo local "${p.equipo_local}": ${equipoLocal.id_equipo}`);
              }
            }
            
            if (!p.id_equipo_visitante && p.equipo_visitante) {
              const equipoVisitante = this.equiposInscritos().find(e => e.nombre === p.equipo_visitante);
              if (equipoVisitante) {
                p.id_equipo_visitante = equipoVisitante.id_equipo;
                console.log(`✅ [PARTIDOS] Encontrado ID para equipo visitante "${p.equipo_visitante}": ${equipoVisitante.id_equipo}`);
              }
            }
          });
          
          // Verificar que los IDs de los partidos coincidan con los equipos cargados
          console.log('🔍 [PARTIDOS] Verificando equipos en partidos:');
          partidosCampeonato.forEach((p: any) => {
            const local = this.equiposInscritos().find(e => e.id_equipo === p.id_equipo_local);
            const visitante = this.equiposInscritos().find(e => e.id_equipo === p.id_equipo_visitante);
            
            console.log(`\n📋 Partido ID ${p.id_partido}:`);
            console.log(`   ${p.equipo_local} (ID Local: ${p.id_equipo_local || 'NO ENCONTRADO'})`);
            console.log(`   ${local ? '✅ Encontrado - Logo: ' + (local.logo_url || 'SIN LOGO') : '❌ NO encontrado'}`);
            console.log(`   ${p.equipo_visitante} (ID Visitante: ${p.id_equipo_visitante || 'NO ENCONTRADO'})`);
            console.log(`   ${visitante ? '✅ Encontrado - Logo: ' + (visitante.logo_url || 'SIN LOGO') : '❌ NO encontrado'}`);
          });
          
          console.log('\n📦 [PARTIDOS] Todos los equipos cargados:');
          this.equiposInscritos().forEach(e => {
            console.log(`   ID: ${e.id_equipo} | Nombre: ${e.nombre} | Logo: ${e.logo_url || 'SIN LOGO'}`);
          });
          
          // AHORA mostrar partidos (los logos ya están cargados)
          this.todosLosPartidos.set(partidosCampeonato);
          
          const fechas = this.fechasDisponibles();
          if (fechas.length > 0) {
            this.fechaActual.set(fechas[0]);
          } else {
            this.fechaActual.set(null);
          }
          
          this.loading.set(false);
        });
      },
      error: (error) => {
        console.error('Error al cargar partidos:', error);
        this.loading.set(false);
      }
    });
  }

  cargarEquiposInscritos(idCampeonato: number, callback?: () => void): void {
    this.liderService.obtenerInscripcionesPorCampeonato(idCampeonato).subscribe({
      next: (response: any) => {
        console.log(`📦 [PARTIDOS] Respuesta completa de inscripciones para campeonato ${idCampeonato}:`, response);
        
        const inscripciones = response.inscripciones || response || [];
        const aprobadas = inscripciones.filter((i: any) => i.estado_inscripcion === 'aprobado');
        
        console.log(`📋 [PARTIDOS] Inscripciones aprobadas:`, aprobadas.length);
        
        const equipos: Equipo[] = aprobadas
          .filter((i: any) => i.equipo)
          .map((i: any) => {
            const equipo = i.equipo;
            // Construir URL completa si solo viene el nombre del archivo
            if (equipo.logo_url && !equipo.logo_url.startsWith('http')) {
              // Si el logo_url es relativo, construir la URL completa
              if (equipo.logo_url.startsWith('uploads/') || equipo.logo_url.startsWith('/uploads/')) {
                equipo.logo_url = `http://localhost:5000/${equipo.logo_url.replace(/^\//, '')}`;
              } else {
                equipo.logo_url = `http://localhost:5000/uploads/logos/${equipo.logo_url}`;
              }
            }
            return equipo;
          });
        
        console.log(`📦 [PARTIDOS] Equipos encontrados para campeonato ${idCampeonato}:`, equipos.length);
        equipos.forEach(e => console.log(`  - ${e.nombre} (ID: ${e.id_equipo}) - Logo: ${e.logo_url || 'SIN LOGO'}`));
        
        // Merge con equipos existentes para no perder datos de otros campeonatos
        const equiposExistentes = this.equiposInscritos();
        const equiposMap = new Map<number, Equipo>();
        
        // Agregar equipos existentes
        equiposExistentes.forEach(e => equiposMap.set(e.id_equipo, e));
        
        // Agregar nuevos equipos (sobrescriben si existen con datos más recientes)
        equipos.forEach(e => equiposMap.set(e.id_equipo, e));
        
        this.equiposInscritos.set(Array.from(equiposMap.values()));
        console.log(`✅ [PARTIDOS] Total equipos inscritos después de cargar campeonato ${idCampeonato}:`, this.equiposInscritos().length);
        
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        console.error(`❌ [PARTIDOS] Error al cargar equipos inscritos del campeonato ${idCampeonato}:`, error);
        // No vaciar equipos existentes si hay error
        if (callback) {
          callback();
        }
      }
    });
  }

  cambiarCampeonato(): void {
    const campeonato = this.campeonatoSeleccionado();
    if (campeonato) {
      this.estadoFilter.set('');
      this.cargarPartidos(campeonato);
    }
  }

  cambiarVista(vista: 'lista' | 'calendario'): void {
    this.vistaActual.set(vista);
  }

  aplicarFiltros(): void {
    // Los filtros se aplican automáticamente en computed
  }

  // Navegación por fechas
  irAFechaAnterior(): void {
    const fechas = this.fechasDisponibles();
    const actual = this.fechaActual();
    if (!actual) return;
    
    const indiceActual = fechas.indexOf(actual);
    if (indiceActual > 0) {
      this.fechaActual.set(fechas[indiceActual - 1]);
    }
  }

  irAFechaSiguiente(): void {
    const fechas = this.fechasDisponibles();
    const actual = this.fechaActual();
    if (!actual) return;
    
    const indiceActual = fechas.indexOf(actual);
    if (indiceActual < fechas.length - 1) {
      this.fechaActual.set(fechas[indiceActual + 1]);
    }
  }

  seleccionarFecha(fecha: string): void {
    this.fechaActual.set(fecha);
  }

  // Obtener logo de equipo
  obtenerLogoEquipo(idEquipo: number | null | undefined): string | null {
    if (!idEquipo || idEquipo === undefined) {
      return null;
    }
    const equipos = this.equiposInscritos();
    const equipo = equipos.find(e => e.id_equipo === idEquipo);
    
    if (equipo) {
      const logoUrl = equipo.logo_url || null;
      return logoUrl;
    }
    return null;
  }

  obtenerNombreEquipo(idEquipo: number | null | undefined): string {
    if (!idEquipo) return 'Equipo desconocido';
    const equipo = this.equiposInscritos().find(e => e.id_equipo === idEquipo);
    if (equipo?.nombre) {
      return equipo.nombre;
    }
    // Fallback: buscar por nombre en los partidos si no se encuentra en equipos inscritos
    const partido = this.todosLosPartidos().find(p => 
      p.id_equipo_local === idEquipo || p.id_equipo_visitante === idEquipo
    );
    if (partido) {
      if (partido.id_equipo_local === idEquipo) {
        return partido.equipo_local || `Equipo ${idEquipo}`;
      }
      if (partido.id_equipo_visitante === idEquipo) {
        return partido.equipo_visitante || `Equipo ${idEquipo}`;
      }
    }
    return `Equipo ${idEquipo}`;
  }

  // MÉTODOS DE CALENDARIO
  mesAnterior(): void {
    const mes = this.mesActual();
    this.mesActual.set(new Date(mes.getFullYear(), mes.getMonth() - 1, 1));
  }

  mesSiguiente(): void {
    const mes = this.mesActual();
    this.mesActual.set(new Date(mes.getFullYear(), mes.getMonth() + 1, 1));
  }

  getDiasDelMes(): Date[] {
    const mes = this.mesActual();
    const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    
    const dias: Date[] = [];
    
    for (let i = 0; i < primerDia.getDay(); i++) {
      dias.push(new Date(0));
    }
    
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      dias.push(new Date(mes.getFullYear(), mes.getMonth(), dia));
    }
    
    return dias;
  }

  getPartidosDelDia(fecha: Date): Partido[] {
    if (fecha.getTime() === 0) return [];
    
    return this.partidosDelMes().filter(p => {
      const fechaPartido = new Date(p.fecha_partido);
      return fechaPartido.getDate() === fecha.getDate();
    });
  }

  getResultadoClase(partido: Partido): string {
    if (partido.estado !== 'finalizado') return '';
    
    let miGoles = 0;
    let susGoles = 0;
    
    if (partido.es_local) {
      miGoles = partido.goles_local;
      susGoles = partido.goles_visitante;
    } else {
      miGoles = partido.goles_visitante;
      susGoles = partido.goles_local;
    }
    
    if (miGoles > susGoles) return 'victoria';
    if (miGoles < susGoles) return 'derrota';
    return 'empate';
  }

  getEstadoPartidoClasses(estado: string): string {
    const classes: { [key: string]: string } = {
      'programado': 'px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold',
      'en_curso': 'px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold',
      'finalizado': 'px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold',
      'cancelado': 'px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 text-xs font-bold'
    };
    return classes[estado] || classes['programado'];
  }

  getEstadoPartidoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'programado': 'Por jugar',
      'en_curso': 'En curso',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado'
    };
    return labels[estado] || estado;
  }

  formatearFechaCorta(fecha: string): string {
    const date = new Date(fecha + 'T00:00:00');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    const diaSemana = dias[date.getDay()];
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    
    return `${diaSemana} ${dia} de ${mes}`;
  }

  formatearHora(fecha: string): string {
    return fecha.split('T')[1]?.substring(0, 5) || '00:00';
  }

  getNombreMes(): string {
    const mes = this.mesActual();
    return mes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  esHoy(fecha: Date): boolean {
    if (fecha.getTime() === 0) return false;
    const hoy = new Date();
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear();
  }

  verDetallePartido(idPartido: number): void {
    this.router.navigate(['/lider-equipo/partidos', idPartido]);
  }
}