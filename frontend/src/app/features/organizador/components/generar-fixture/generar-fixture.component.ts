import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrganizadorService, Campeonato, Equipo } from '../../services/organizador.service';
import { DatepickerComponent } from '../../../../shared/components/datepicker/datepicker.component';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';

interface PartidoPreview {
  jornada: number;
  fecha: string;
  hora: string;
  equipoLocal: string;
  equipoVisitante: string;
  grupo?: string;
}

@Component({
  selector: 'app-generar-fixture',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DatepickerComponent,
    ToastComponent
  ],
  templateUrl: './generar-fixture.component.html',
  styleUrls: ['./generar-fixture.component.scss']
})
export class GenerarFixtureComponent implements OnInit {
  // Exponer Object y Math para el template
  Object = Object;
  Math = Math;
  
  // Estados
  loading = signal(false);
  vistaActual = signal<'seleccion' | 'configuracion' | 'preview'>('seleccion');
  
  // Datos
  campeonato = signal<Campeonato | null>(null);
  equiposInscritos = signal<Equipo[]>([]);
  idCampeonato = 0;
  
  // Tipo de campeonato seleccionado
  tipoSeleccionado = signal<'liga' | 'eliminacion_directa' | 'fase_grupos' | null>(null);
  
  // Configuración
  configuracionForm!: FormGroup;
  
  // Preview
  partidosPreview = signal<PartidoPreview[]>([]);
  gruposPreview = signal<{ [key: string]: string[] }>({});
  
  // Toast
  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');

  // Computeds
  tieneEquipos = computed(() => this.equiposInscritos().length >= 2);
  puedeGenerarFixture = computed(() => 
    this.tieneEquipos() && 
    this.tipoSeleccionado() !== null &&
    this.configuracionForm?.valid
  );

  constructor(
    private organizadorService: OrganizadorService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.inicializarForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['idCampeonato']) {
        this.idCampeonato = +params['idCampeonato'];
        this.cargarDatos();
      } else {
        this.mostrarToast('error', 'Error', 'No se especificó el campeonato');
        this.volver();
      }
    });
  }

  inicializarForm(): void {
    this.configuracionForm = this.fb.group({
      fecha_inicio: ['', Validators.required],
      dias_entre_jornadas: [7, [Validators.required, Validators.min(1), Validators.max(30)]],
      hora_inicio: ['15:00', Validators.required],
      hora_segundo_partido: ['17:00', Validators.required],
      incluir_vuelta: [true],
      numero_grupos: [4, [Validators.min(2), Validators.max(8)]]
    });
  }

  cargarDatos(): void {
    this.loading.set(true);
    
    // Cargar campeonato
    this.organizadorService.obtenerCampeonatoPorId(this.idCampeonato).subscribe({
      next: (response) => {
        this.campeonato.set(response.campeonato);
        
        // Si ya tiene tipo definido, pre-seleccionarlo
        if (response.campeonato.tipo_competicion) {
          this.tipoSeleccionado.set(response.campeonato.tipo_competicion as any);
        }
      },
      error: (error) => {
        console.error('Error al cargar campeonato:', error);
        this.mostrarToast('error', 'Error', 'No se pudo cargar el campeonato');
      }
    });

    // Cargar equipos inscritos y aprobados
    this.organizadorService.obtenerInscripcionesPorCampeonato(this.idCampeonato, 'aprobado').subscribe({
      next: (response) => {
        const inscripciones = response.inscripciones || [];
        
        if (inscripciones.length === 0) {
          this.equiposInscritos.set([]);
          this.loading.set(false);
          return;
        }

        const equiposPromises = inscripciones.map((i: any) => 
          this.organizadorService.obtenerEquipoPorId(i.id_equipo).toPromise()
        );
        
        Promise.all(equiposPromises).then((responses) => {
          const equipos = responses
            .filter(r => r !== undefined && r !== null)
            .map((r: any) => r.equipo || r) as Equipo[];
          
          this.equiposInscritos.set(equipos);
          this.loading.set(false);
        });
      },
      error: (error) => {
        console.error('Error al cargar equipos:', error);
        this.equiposInscritos.set([]);
        this.loading.set(false);
      }
    });
  }

  // ==================== SELECCIÓN DE TIPO ====================

  seleccionarTipo(tipo: 'liga' | 'eliminacion_directa' | 'fase_grupos'): void {
    this.tipoSeleccionado.set(tipo);
    this.vistaActual.set('configuracion');
  }

  // ==================== GENERACIÓN DE PREVIEW ====================

  generarPreview(): void {
    const tipo = this.tipoSeleccionado();
    const equipos = this.equiposInscritos();
    
    if (!tipo) return;

    if (equipos.length === 0) {
      // Preview sin equipos (genérico)
      this.generarPreviewGenerico(tipo);
    } else {
      // Preview con equipos reales
      this.generarPreviewConEquipos(tipo, equipos);
    }

    this.vistaActual.set('preview');
  }

  generarPreviewGenerico(tipo: string): void {
    const numEquipos = this.campeonato()?.max_equipos || 8;
    const config = this.configuracionForm.value;
    
    switch(tipo) {
      case 'liga':
        this.generarPreviewLiga(numEquipos, config, true);
        break;
      case 'eliminacion_directa':
        this.generarPreviewEliminacion(numEquipos, config, true);
        break;
      case 'fase_grupos':
        this.generarPreviewGrupos(numEquipos, config, true);
        break;
    }
  }

  generarPreviewConEquipos(tipo: string, equipos: Equipo[]): void {
    const config = this.configuracionForm.value;
    
    switch(tipo) {
      case 'liga':
        this.generarPreviewLiga(equipos.length, config, false, equipos);
        break;
      case 'eliminacion_directa':
        this.generarPreviewEliminacion(equipos.length, config, false, equipos);
        break;
      case 'fase_grupos':
        this.generarPreviewGrupos(equipos.length, config, false, equipos);
        break;
    }
  }

  generarPreviewLiga(numEquipos: number, config: any, generico: boolean, equipos?: Equipo[]): void {
    const partidos: PartidoPreview[] = [];
    let jornada = 1;
    let fechaActual = new Date(config.fecha_inicio);

    // Generar IDA
    for (let i = 0; i < numEquipos; i++) {
      for (let j = i + 1; j < numEquipos; j++) {
        const equipoLocal = generico ? `Equipo ${String.fromCharCode(65 + i)}` : equipos![i].nombre;
        const equipoVisitante = generico ? `Equipo ${String.fromCharCode(65 + j)}` : equipos![j].nombre;
        
        partidos.push({
          jornada,
          fecha: fechaActual.toISOString().split('T')[0],
          hora: partidos.length % 2 === 0 ? config.hora_inicio : config.hora_segundo_partido,
          equipoLocal,
          equipoVisitante
        });
        
        if (partidos.filter(p => p.jornada === jornada).length >= Math.floor(numEquipos / 2)) {
          jornada++;
          fechaActual.setDate(fechaActual.getDate() + config.dias_entre_jornadas);
        }
      }
    }

    // Generar VUELTA si está habilitado
    if (config.incluir_vuelta) {
      const partidosIda = [...partidos];
      partidosIda.forEach(partido => {
        partidos.push({
          jornada,
          fecha: fechaActual.toISOString().split('T')[0],
          hora: partido.hora,
          equipoLocal: partido.equipoVisitante,
          equipoVisitante: partido.equipoLocal
        });
        
        if (partidos.filter(p => p.jornada === jornada).length >= Math.floor(numEquipos / 2)) {
          jornada++;
          fechaActual.setDate(fechaActual.getDate() + config.dias_entre_jornadas);
        }
      });
    }

    this.partidosPreview.set(partidos);
  }

  generarPreviewEliminacion(numEquipos: number, config: any, generico: boolean, equipos?: Equipo[]): void {
    const partidos: PartidoPreview[] = [];
    let equiposPotencia2 = Math.pow(2, Math.ceil(Math.log2(numEquipos)));
    let ronda = 1;
    let fechaActual = new Date(config.fecha_inicio);

    while (equiposPotencia2 >= 2) {
      const partidosRonda = equiposPotencia2 / 2;
      
      for (let i = 0; i < partidosRonda; i++) {
        const equipoLocal = generico 
          ? `${this.getNombreRonda(equiposPotencia2)} - Partido ${i + 1} Local`
          : equipos && equipos[i * 2] ? equipos[i * 2].nombre : `Equipo ${i * 2 + 1}`;
        
        const equipoVisitante = generico
          ? `${this.getNombreRonda(equiposPotencia2)} - Partido ${i + 1} Visitante`
          : equipos && equipos[i * 2 + 1] ? equipos[i * 2 + 1].nombre : `Equipo ${i * 2 + 2}`;
        
        partidos.push({
          jornada: ronda,
          fecha: fechaActual.toISOString().split('T')[0],
          hora: i % 2 === 0 ? config.hora_inicio : config.hora_segundo_partido,
          equipoLocal,
          equipoVisitante
        });
      }

      equiposPotencia2 /= 2;
      ronda++;
      fechaActual.setDate(fechaActual.getDate() + config.dias_entre_jornadas);
    }

    this.partidosPreview.set(partidos);
  }

  generarPreviewGrupos(numEquipos: number, config: any, generico: boolean, equipos?: Equipo[]): void {
    const numeroGrupos = config.numero_grupos || 4;
    const equiposPorGrupo = Math.ceil(numEquipos / numeroGrupos);
    const grupos: { [key: string]: string[] } = {};
    const letrasGrupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    // Crear grupos
    for (let i = 0; i < numeroGrupos; i++) {
      const letra = letrasGrupos[i];
      grupos[letra] = [];
      
      for (let j = 0; j < equiposPorGrupo; j++) {
        const indexEquipo = i * equiposPorGrupo + j;
        if (indexEquipo < numEquipos) {
          const nombreEquipo = generico
            ? `Equipo ${indexEquipo + 1}`
            : equipos && equipos[indexEquipo] ? equipos[indexEquipo].nombre : `Equipo ${indexEquipo + 1}`;
          
          grupos[letra].push(nombreEquipo);
        }
      }
    }

    this.gruposPreview.set(grupos);

    // Generar partidos de fase de grupos
    const partidos: PartidoPreview[] = [];
    let jornada = 1;
    let fechaActual = new Date(config.fecha_inicio);

    Object.keys(grupos).forEach(grupo => {
      const equiposGrupo = grupos[grupo];
      
      // Todos contra todos en el grupo
      for (let i = 0; i < equiposGrupo.length; i++) {
        for (let j = i + 1; j < equiposGrupo.length; j++) {
          partidos.push({
            jornada,
            fecha: fechaActual.toISOString().split('T')[0],
            hora: partidos.length % 2 === 0 ? config.hora_inicio : config.hora_segundo_partido,
            equipoLocal: equiposGrupo[i],
            equipoVisitante: equiposGrupo[j],
            grupo: `Grupo ${grupo}`
          });
        }
      }
      
      jornada++;
      fechaActual.setDate(fechaActual.getDate() + config.dias_entre_jornadas);
    });

    this.partidosPreview.set(partidos);
  }

  getNombreRonda(equiposRestantes: number): string {
    const nombres: { [key: number]: string } = {
      2: 'Final',
      4: 'Semifinal',
      8: 'Cuartos',
      16: 'Octavos',
      32: 'Dieciseisavos'
    };
    return nombres[equiposRestantes] || `Ronda de ${equiposRestantes}`;
  }

  // ==================== CONFIRMACIÓN Y GENERACIÓN ====================

  confirmarGeneracion(): void {
    if (!this.puedeGenerarFixture()) {
      if (!this.tieneEquipos()) {
        this.mostrarToast(
          'warning',
          'No puedes generar el fixture',
          'Debes tener al menos 2 equipos aprobados. Ve a "Ver Solicitudes" para aprobar equipos.'
        );
      }
      return;
    }

    if (confirm('¿Confirmas la generación del fixture? Esta acción no se puede deshacer.')) {
      this.generarFixtureReal();
    }
  }

  generarFixtureReal(): void {
    this.loading.set(true);
    
    const datos = {
      ...this.configuracionForm.value,
      tipo_competicion: this.tipoSeleccionado()
    };

    this.organizadorService.generarPartidos(this.idCampeonato, datos).subscribe({
      next: (response) => {
        this.mostrarToast(
          'success',
          '¡Fixture generado!',
          `Se generaron ${response.total_partidos} partidos en ${response.total_jornadas} jornadas`
        );
        
        setTimeout(() => {
          this.volver();
        }, 2000);
      },
      error: (error) => {
        console.error('Error al generar fixture:', error);
        this.mostrarToast('error', 'Error', 'No se pudo generar el fixture');
        this.loading.set(false);
      }
    });
  }

  // ==================== NAVEGACIÓN ====================

  volverASeleccion(): void {
    this.vistaActual.set('seleccion');
  }

  volverAConfiguracion(): void {
    this.vistaActual.set('configuracion');
  }

  volver(): void {
    this.router.navigate(['/organizador/mi-campeonato']);
  }

  // ==================== UTILIDADES ====================

  mostrarToast(tipo: 'success' | 'error' | 'warning' | 'info', titulo: string, mensaje: string): void {
    this.toastType.set(tipo);
    this.toastTitle.set(titulo);
    this.toastMessage.set(mensaje);
    this.showToast.set(true);
    
    setTimeout(() => {
      this.showToast.set(false);
    }, 5000);
  }

  cerrarToast(): void {
    this.showToast.set(false);
  }

  getJornadasUnicas(): number[] {
    const jornadas = new Set(this.partidosPreview().map(p => p.jornada));
    return Array.from(jornadas).sort((a, b) => a - b);
  }

  getPartidosPorJornada(jornada: number): PartidoPreview[] {
    return this.partidosPreview().filter(p => p.jornada === jornada);
  }
}