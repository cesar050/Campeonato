import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizadorService } from '../../services/organizador.service';

@Component({
  selector: 'app-equipo-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './equipo-detalle.component.html',
  styleUrls: ['./equipo-detalle.component.scss']
})
export class EquipoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private organizadorService = inject(OrganizadorService);

  isLoading = signal(true);
  activeTab = signal('informacion');
  showAprobarModal = signal(false);
  showRechazarModal = signal(false);

  equipo = signal<any>(null);
  notasAprobacion = signal('');
  motivoRechazo = signal('');
  sugerencias = signal({
    documentacion: false,
    jugadores: false
  });

  equipoId = 0;

  ngOnInit() {
    this.equipoId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadEquipo();
  }

  loadEquipo() {
    this.isLoading.set(true);
    this.organizadorService.getEquipo(this.equipoId).subscribe({
      next: (response) => {
        this.equipo.set(response.equipo || response);
        this.isLoading.set(false);
      },
      error: () => {
        // Mock data
        this.equipo.set({
          id_equipo: this.equipoId,
          nombre: 'F.C. Solar',
          estado: 'pendiente',
          fecha_fundacion: '12 de Enero de 2020',
          lider: 'Carlos Rodríguez',
          telefono: '+54 9 11 1234-5678',
          estadio: 'Estadio del Sol',
          colores: 'Amarillo y Azul',
          fecha_registro: '25 de Mayo de 2024',
          observaciones: 'El equipo presentó la documentación de 15 de los 18 jugadores. Faltan 3 documentos de identidad por verificar.',
          jugadores: [
            {
              id: 1,
              nombre: 'Lionel',
              apellido: 'Messi',
              numero: 10,
              posicion: 'Delantero',
              documento: '25.123.456',
              fecha_nacimiento: '24/06/1987',
              edad: 37
            }
          ],
          documentos: [
            {
              id: 1,
              nombre: 'dni_messi.pdf',
              tipo: 'documento_identidad',
              estado: 'aprobado'
            }
          ]
        });
        this.isLoading.set(false);
      }
    });
  }

  setActiveTab(tab: string) {
    this.activeTab.set(tab);
  }

  openAprobarModal() {
    this.showAprobarModal.set(true);
  }

  closeAprobarModal() {
    this.showAprobarModal.set(false);
    this.notasAprobacion.set('');
  }

  openRechazarModal() {
    this.showRechazarModal.set(true);
  }

  closeRechazarModal() {
    this.showRechazarModal.set(false);
    this.motivoRechazo.set('');
    this.sugerencias.set({ documentacion: false, jugadores: false });
  }

  confirmarAprobacion() {
    console.log('Aprobar equipo con notas:', this.notasAprobacion());
    this.closeAprobarModal();
    this.router.navigate(['/organizador/equipos']);
  }

  confirmarRechazo() {
    console.log('Rechazar equipo:', this.motivoRechazo(), this.sugerencias());
    this.closeRechazarModal();
    this.router.navigate(['/organizador/equipos']);
  }
  updateSugerencia(campo: 'documentacion' | 'jugadores', value: boolean) {
    this.sugerencias.update(s => ({
      ...s,
      [campo]: value
    }));
  }

  volver() {
    this.router.navigate(['/organizador/equipos']);
  }
}