import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-placeholder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-placeholder.component.html',
  styleUrls: ['./image-placeholder.component.scss']
})
export class ImagePlaceholderComponent {
  @Input() src: string | null = null;
  @Input() alt: string = 'Imagen';
  @Input() type: 'logo' | 'avatar' | 'team' | 'player' | 'championship' = 'logo';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() fallbackIcon: string | null = null;

  imageError = false;

  onImageError(): void {
    this.imageError = true;
  }

  getPlaceholderIcon(): string {
    if (this.fallbackIcon) return this.fallbackIcon;
    
    const icons = {
      logo: 'shield',
      avatar: 'account_circle',
      team: 'groups',
      player: 'sports_soccer',
      championship: 'emoji_events'
    };
    
    return icons[this.type] || 'image';
  }

  getPlaceholderText(): string {
    if (this.type === 'avatar' || this.type === 'player') {
      return this.alt.charAt(0).toUpperCase();
    }
    return '';
  }
}
