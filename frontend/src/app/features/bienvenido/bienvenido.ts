import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-bienvenido',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './bienvenido.html',
  styleUrl: './bienvenido.scss',
})
export class BienvenidoComponent {
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/logo.png'; // Fallback si la imagen no se encuentra
  }
}
