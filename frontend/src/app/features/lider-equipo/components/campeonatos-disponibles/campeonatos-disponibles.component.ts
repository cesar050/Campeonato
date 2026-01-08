import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LiderEquipoService } from '../../services/lider-equipo.service';
import { CampeonatoDisponible, Equipo } from '../../models/lider-equipo.models';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastComponent } from '../../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-campeonatos-disponibles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmDialogComponent, ToastComponent],
  templateUrl: './campeonatos-disponibles.component.html',
  styleUrls: ['./campeonatos-disponibles.component.scss']
})
export class CampeonatosDisponiblesComponent implements OnInit {
  // Estados
  loading = signal(true);
  loadingCodigo = signal(false);
  inscribiendo = signal(false);

  // Datos
  campeonatosPublicos = signal<CampeonatoDisponible[]>([]);
  campeonatoBuscado = signal<CampeonatoDisponible | null>(null);
  misEquipos = signal<Equipo[]>([]);

  // Filtros
  tipoDeporteFilter = signal<string>('');
  buscarTexto = signal<string>('');
  codigoBusqueda = signal<string>('');

  // Errores
  errorCodigo = signal<string>('');
  errorInscripcion = signal<string>('');

  // UI: confirm/toast (sin diálogos nativos)
  showConfirmInscribir = signal(false);
  campeonatoParaInscribir = signal<CampeonatoDisponible | null>(null);
  equipoParaInscribirId = signal<number | null>(null);

  showToast = signal(false);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');
  toastTitle = signal('');
  toastMessage = signal('');

  constructor(private liderService: LiderEquipoService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);

    // Cargar campeonatos públicos
    this.liderService.obtenerCampeonatosPublicos().subscribe({
      next: (response) => {
        this.campeonatosPublicos.set(response.campeonatos);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar campeonatos:', error);
        this.loading.set(false);
      }
    });

    // Cargar equipos del líder
    this.liderService.obtenerMisEquipos().subscribe({
      next: (response) => {
        this.misEquipos.set(response.equipos);
      },
      error: (error) => console.error('Error al cargar equipos:', error)
    });
  }

  aplicarFiltros(): void {
    const tipo = this.tipoDeporteFilter();
    const texto = this.buscarTexto();

    this.loading.set(true);

    this.liderService.obtenerCampeonatosPublicos(tipo, undefined, texto).subscribe({
      next: (response) => {
        this.campeonatosPublicos.set(response.campeonatos);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al filtrar campeonatos:', error);
        this.loading.set(false);
      }
    });
  }

  buscarPorCodigo(): void {
    const codigo = this.codigoBusqueda().trim();

    if (!codigo) {
      this.errorCodigo.set('Ingresa un código');
      return;
    }

    this.loadingCodigo.set(true);
    this.errorCodigo.set('');

    this.liderService.buscarCampeonatoPorCodigo(codigo).subscribe({
      next: (response) => {
        this.campeonatoBuscado.set(response.campeonato);
        this.loadingCodigo.set(false);
        this.codigoBusqueda.set('');
      },
      error: (error) => {
        console.error('Error al buscar por código:', error);
        this.errorCodigo.set(error.error?.error || 'Código inválido');
        this.loadingCodigo.set(false);
      }
    });
  }

  inscribirEquipo(campeonato: CampeonatoDisponible, idEquipo: number): void {
    if (!idEquipo) {
      this.mostrarToast('warning', 'Selecciona un equipo', 'Debes elegir un equipo para inscribirte.');
      return;
    }

    // Verificar si el equipo ya está inscrito
    const equipo = this.misEquipos().find(e => e.id_equipo === idEquipo);
    if (equipo && equipo.campeonatos) {
      const yaInscrito = equipo.campeonatos.some(c => c.id_campeonato === campeonato.id_campeonato);
      if (yaInscrito) {
        this.mostrarToast('info', 'Ya inscrito', 'Este equipo ya está inscrito en este campeonato.');
        return;
      }
    }

    this.campeonatoParaInscribir.set(campeonato);
    this.equipoParaInscribirId.set(idEquipo);
    this.showConfirmInscribir.set(true);
  }

  confirmInscripcion(confirmed: boolean): void {
    if (!confirmed) {
      this.showConfirmInscribir.set(false);
      this.campeonatoParaInscribir.set(null);
      this.equipoParaInscribirId.set(null);
      return;
    }

    const campeonato = this.campeonatoParaInscribir();
    const idEquipo = this.equipoParaInscribirId();
    if (!campeonato || !idEquipo) {
      this.showConfirmInscribir.set(false);
      this.campeonatoParaInscribir.set(null);
      this.equipoParaInscribirId.set(null);
      return;
    }

    this.inscribiendo.set(true);
    this.errorInscripcion.set('');

    this.liderService.inscribirEquipo(campeonato.id_campeonato, idEquipo).subscribe({
      next: () => {
        this.inscribiendo.set(false);
        this.mostrarToast('success', 'Inscripción enviada', 'Tu solicitud fue enviada. Espera la aprobación del organizador.');
        
        // Recargar equipos para actualizar inscripciones
        this.liderService.obtenerMisEquipos().subscribe({
          next: (response) => this.misEquipos.set(response.equipos)
        });

        // Limpiar campeonato buscado
        this.campeonatoBuscado.set(null);
        this.showConfirmInscribir.set(false);
        this.campeonatoParaInscribir.set(null);
        this.equipoParaInscribirId.set(null);
      },
      error: (error) => {
        console.error('Error al inscribir:', error);
        this.errorInscripcion.set(error.error?.error || 'Error al inscribir equipo');
        this.inscribiendo.set(false);
        this.mostrarToast('error', 'No se pudo inscribir', this.errorInscripcion());
        this.showConfirmInscribir.set(false);
        this.campeonatoParaInscribir.set(null);
        this.equipoParaInscribirId.set(null);
      }
    });
  }

  mostrarToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string): void {
    this.toastType.set(type);
    this.toastTitle.set(title);
    this.toastMessage.set(message);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 5000);
  }

  getTipoDeporteTexto(tipo: string): string {
    return tipo === 'futbol' ? 'Fútbol 11' : 'Indoor / Fútbol 5';
  }

  getTipoCompeticionTexto(tipo: string): string {
    const tipos: any = {
      'liga': 'Liga',
      'eliminacion_directa': 'Eliminación Directa',
      'mixto': 'Mixto'
    };
    return tipos[tipo] || tipo;
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  equipoYaInscrito(campeonatoId: number, equipoId: number): boolean {
    const equipo = this.misEquipos().find(e => e.id_equipo === equipoId);
    if (!equipo || !equipo.campeonatos) return false;
    
    return equipo.campeonatos.some(c => c.id_campeonato === campeonatoId);
  }

  cerrarCampeonatoBuscado(): void {
    this.campeonatoBuscado.set(null);
    this.codigoBusqueda.set('');
    this.errorCodigo.set('');
  }
}