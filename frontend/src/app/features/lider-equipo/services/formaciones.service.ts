import { Injectable, signal } from '@angular/core';

export interface FormacionConfig {
  id: string;
  nombre: string;
  codigo: string;
  tipo: '11' | '6';
  posiciones: Array<{ x: number; y: number; posicion: string }>;
  personalizada: boolean;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FormacionesService {
  private formaciones = signal<FormacionConfig[]>([]);

  constructor() {
    this.cargarFormaciones();
  }

  private cargarFormaciones(): void {
    // Cargar personalizadas de localStorage
    const guardadas = localStorage.getItem('formaciones_personalizadas');
    const personalizadas: FormacionConfig[] = guardadas ? JSON.parse(guardadas) : [];

    // Formaciones predefinidas
    const predefinidas: FormacionConfig[] = [
      {
        id: '4-4-2',
        nombre: '4-4-2 Clásica',
        codigo: '4-4-2',
        tipo: '11',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 95, posicion: 'Portero' },
          { x: 20, y: 75, posicion: 'Defensa' },
          { x: 40, y: 75, posicion: 'Defensa' },
          { x: 60, y: 75, posicion: 'Defensa' },
          { x: 80, y: 75, posicion: 'Defensa' },
          { x: 20, y: 50, posicion: 'Mediocampista' },
          { x: 40, y: 50, posicion: 'Mediocampista' },
          { x: 60, y: 50, posicion: 'Mediocampista' },
          { x: 80, y: 50, posicion: 'Mediocampista' },
          { x: 35, y: 20, posicion: 'Delantero' },
          { x: 65, y: 20, posicion: 'Delantero' }
        ]
      },
      {
        id: '4-3-3',
        nombre: '4-3-3 Ofensiva',
        codigo: '4-3-3',
        tipo: '11',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 95, posicion: 'Portero' },
          { x: 20, y: 75, posicion: 'Defensa' },
          { x: 40, y: 75, posicion: 'Defensa' },
          { x: 60, y: 75, posicion: 'Defensa' },
          { x: 80, y: 75, posicion: 'Defensa' },
          { x: 30, y: 50, posicion: 'Mediocampista' },
          { x: 50, y: 50, posicion: 'Mediocampista' },
          { x: 70, y: 50, posicion: 'Mediocampista' },
          { x: 20, y: 20, posicion: 'Delantero' },
          { x: 50, y: 15, posicion: 'Delantero' },
          { x: 80, y: 20, posicion: 'Delantero' }
        ]
      },
      {
        id: '3-5-2',
        nombre: '3-5-2',
        codigo: '3-5-2',
        tipo: '11',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 95, posicion: 'Portero' },
          { x: 30, y: 75, posicion: 'Defensa' },
          { x: 50, y: 75, posicion: 'Defensa' },
          { x: 70, y: 75, posicion: 'Defensa' },
          { x: 15, y: 50, posicion: 'Mediocampista' },
          { x: 35, y: 50, posicion: 'Mediocampista' },
          { x: 50, y: 50, posicion: 'Mediocampista' },
          { x: 65, y: 50, posicion: 'Mediocampista' },
          { x: 85, y: 50, posicion: 'Mediocampista' },
          { x: 35, y: 20, posicion: 'Delantero' },
          { x: 65, y: 20, posicion: 'Delantero' }
        ]
      },
      {
        id: '4-2-3-1',
        nombre: '4-2-3-1',
        codigo: '4-2-3-1',
        tipo: '11',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 95, posicion: 'Portero' },
          { x: 20, y: 75, posicion: 'Defensa' },
          { x: 40, y: 75, posicion: 'Defensa' },
          { x: 60, y: 75, posicion: 'Defensa' },
          { x: 80, y: 75, posicion: 'Defensa' },
          { x: 35, y: 60, posicion: 'Mediocampista' },
          { x: 65, y: 60, posicion: 'Mediocampista' },
          { x: 25, y: 35, posicion: 'Mediocampista' },
          { x: 50, y: 35, posicion: 'Mediocampista' },
          { x: 75, y: 35, posicion: 'Mediocampista' },
          { x: 50, y: 15, posicion: 'Delantero' }
        ]
      },
      {
        id: '3-4-3',
        nombre: '3-4-3',
        codigo: '3-4-3',
        tipo: '11',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 95, posicion: 'Portero' },
          { x: 30, y: 75, posicion: 'Defensa' },
          { x: 50, y: 75, posicion: 'Defensa' },
          { x: 70, y: 75, posicion: 'Defensa' },
          { x: 20, y: 50, posicion: 'Mediocampista' },
          { x: 40, y: 50, posicion: 'Mediocampista' },
          { x: 60, y: 50, posicion: 'Mediocampista' },
          { x: 80, y: 50, posicion: 'Mediocampista' },
          { x: 25, y: 20, posicion: 'Delantero' },
          { x: 50, y: 15, posicion: 'Delantero' },
          { x: 75, y: 20, posicion: 'Delantero' }
        ]
      },
      {
        id: '1-2-2',
        nombre: '1-2-2 Indoor',
        codigo: '1-2-2',
        tipo: '6',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 90, posicion: 'Portero' },
          { x: 30, y: 65, posicion: 'Defensa' },
          { x: 70, y: 65, posicion: 'Defensa' },
          { x: 30, y: 35, posicion: 'Mediocampista' },
          { x: 70, y: 35, posicion: 'Mediocampista' },
          { x: 50, y: 15, posicion: 'Delantero' }
        ]
      },
      {
        id: '1-1-3',
        nombre: '1-1-3 Indoor Ofensivo',
        codigo: '1-1-3',
        tipo: '6',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 90, posicion: 'Portero' },
          { x: 50, y: 65, posicion: 'Defensa' },
          { x: 25, y: 35, posicion: 'Delantero' },
          { x: 50, y: 30, posicion: 'Delantero' },
          { x: 75, y: 35, posicion: 'Delantero' },
          { x: 50, y: 10, posicion: 'Delantero' }
        ]
      },
      {
        id: '1-3-1',
        nombre: '1-3-1 Indoor Defensivo',
        codigo: '1-3-1',
        tipo: '6',
        personalizada: false,
        createdAt: new Date(),
        posiciones: [
          { x: 50, y: 90, posicion: 'Portero' },
          { x: 25, y: 65, posicion: 'Defensa' },
          { x: 50, y: 65, posicion: 'Defensa' },
          { x: 75, y: 65, posicion: 'Defensa' },
          { x: 35, y: 30, posicion: 'Mediocampista' },
          { x: 50, y: 15, posicion: 'Delantero' }
        ]
      }
    ];

    const todas = [...predefinidas, ...personalizadas];
    this.formaciones.set(todas);
  }

  obtenerTodas(): FormacionConfig[] {
    return this.formaciones();
  }

  obtenerPorTipo(tipo: '11' | '6'): FormacionConfig[] {
    return this.formaciones().filter(f => f.tipo === tipo);
  }

  obtenerPorCodigo(codigo: string): FormacionConfig | undefined {
    return this.formaciones().find(f => f.codigo === codigo);
  }

  recargarFormaciones(): void {
    this.cargarFormaciones();
  }
}