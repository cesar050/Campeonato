import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="image-placeholder" 
      [class]="getSizeClass()"
      [class.profile]="profile"
      [attr.aria-label]="ariaLabel">
      <span class="material-symbols-outlined" [style.fontSize]="getIconSize()">
        {{ icon }}
      </span>
    </div>
  `,
  styles: [`
    .image-placeholder {
      background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      
      &::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
        opacity: 0;
        transition: opacity 0.3s;
      }

      &:hover::before {
        opacity: 1;
      }
      
      span {
        color: #2E7D32;
        z-index: 1;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      &:hover span {
        transform: scale(1.1);
      }
      
      &.small {
        width: 64px;
        height: 64px;
        
        span {
          font-size: 2rem;
        }
      }
      
      &.medium {
        width: 120px;
        height: 120px;
        
        span {
          font-size: 3rem;
        }
      }
      
      &.large {
        width: 200px;
        height: 200px;
        
        span {
          font-size: 5rem;
        }
      }

      &.xlarge {
        width: 300px;
        height: 300px;
        
        span {
          font-size: 7rem;
        }
      }
      
      &.profile {
        border-radius: 50%;
      }

      &.square {
        border-radius: 8px;
      }

      &.rounded {
        border-radius: 16px;
      }
    }

    @media (prefers-color-scheme: dark) {
      .image-placeholder {
        background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%);
        
        span {
          color: #C8E6C9;
        }
      }
    }

    @media (max-width: 640px) {
      .image-placeholder {
        &.large {
          width: 150px;
          height: 150px;
          
          span {
            font-size: 4rem;
          }
        }

        &.xlarge {
          width: 200px;
          height: 200px;
          
          span {
            font-size: 5rem;
          }
        }
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .image-placeholder {
        &::before,
        span {
          transition: none !important;
        }

        &:hover span {
          transform: none;
        }
      }
    }
  `]
})
export class ImagePlaceholderComponent {
  @Input() icon = 'image';
  @Input() size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium';
  @Input() profile = false;
  @Input() ariaLabel = 'Imagen placeholder';

  getSizeClass(): string {
    return this.size;
  }

  getIconSize(): string {
    const sizes = {
      small: '2rem',
      medium: '3rem',
      large: '5rem',
      xlarge: '7rem'
    };
    return sizes[this.size];
  }
}