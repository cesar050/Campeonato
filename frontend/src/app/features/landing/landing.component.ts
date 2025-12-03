import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  features = [
    {
      icon: 'users',
      title: 'Gestión de Equipos',
      description: 'Administra jugadores, plantillas y transferencias en un solo lugar.'
    },
    {
      icon: 'calendar',
      title: 'Calendario Automático',
      description: 'Genera automáticamente los calendarios de partidos y evita conflictos.'
    },
    {
      icon: 'trending-up',
      title: 'Estadísticas en Vivo',
      description: 'Sigue los resultados, goleadores y clasificaciones en tiempo real.'
    },
    {
      icon: 'clipboard-list',
      title: 'Inscripciones Online',
      description: 'Permite que los equipos se registren y paguen de forma segura en línea.'
    },
    {
      icon: 'message-square',
      title: 'Comunicación Fácil',
      description: 'Envía notificaciones y mensajes a todos los participantes.'
    },
    {
      icon: 'award',
      title: 'Perfiles Personalizados',
      description: 'Cada equipo y jugador tiene su propio perfil con sus estadísticas.'
    }
  ];

  steps = [
    {
      number: '1',
      title: 'Crea tu Campeonato',
      description: 'Configura los detalles de tu liga, como el nombre, las fechas y el reglamento, en minutos.'
    },
    {
      number: '2',
      title: 'Invita a los Equipos',
      description: 'Comparte un enlace de invitación para que los equipos se inscriban y gestionen sus plantillas.'
    },
    {
      number: '3',
      title: '¡Empieza a Jugar!',
      description: 'El calendario se genera automáticamente. Solo queda disfrutar del juego y seguir los resultados en vivo.'
    }
  ];
}