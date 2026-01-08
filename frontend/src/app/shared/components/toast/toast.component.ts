import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" [class.show]="show">
      <div class="toast" [ngClass]="'toast-' + type">
        <div class="toast-icon">
          <span class="material-symbols-outlined">
            {{ getIcon() }}
          </span>
        </div>
        <div class="toast-content">
          <h4 class="toast-title">{{ title }}</h4>
          <p class="toast-message">{{ message }}</p>
        </div>
        <button 
          class="toast-close" 
          (click)="onClose()" 
          type="button"
          aria-label="Cerrar notificación">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 90vw;
      
      &.show {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .toast {
      min-width: 320px;
      max-width: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem;
      border-left: 4px solid;
      animation: slideInRight 0.3s ease-out;
      
      &.toast-success { 
        border-left-color: #2E7D32;
        background: linear-gradient(to right, rgba(46, 125, 50, 0.05) 0%, white 20%);
      }
      &.toast-error { 
        border-left-color: #DC2626;
        background: linear-gradient(to right, rgba(220, 38, 38, 0.05) 0%, white 20%);
      }
      &.toast-warning { 
        border-left-color: #F59E0B;
        background: linear-gradient(to right, rgba(245, 158, 11, 0.05) 0%, white 20%);
      }
      &.toast-info { 
        border-left-color: #3B82F6;
        background: linear-gradient(to right, rgba(59, 130, 246, 0.05) 0%, white 20%);
      }
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .toast-success & {
        background: #E8F5E9;
        color: #2E7D32;
      }
      
      .toast-error & {
        background: #FEE2E2;
        color: #DC2626;
      }
      
      .toast-warning & {
        background: #FEF3C7;
        color: #F59E0B;
      }
      
      .toast-info & {
        background: #DBEAFE;
        color: #3B82F6;
      }

      span {
        font-size: 1.5rem;
      }
    }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-size: 1rem;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 0.25rem;
      line-height: 1.4;
    }

    .toast-message {
      font-size: 0.875rem;
      color: #6B7280;
      margin: 0;
      line-height: 1.5;
    }

    .toast-close {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9CA3AF;
      transition: all 0.2s;
      
      &:hover {
        background: #F3F4F6;
        color: #1F2937;
      }

      &:active {
        transform: scale(0.95);
      }

      span {
        font-size: 1.25rem;
      }
    }

    @media (max-width: 640px) {
      .toast-container {
        top: 1rem;
        left: 1rem;
        right: 1rem;
      }
      
      .toast {
        min-width: auto;
      }
    }

    @media (prefers-color-scheme: dark) {
      .toast {
        background: #1F2937;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        
        &.toast-success { 
          background: linear-gradient(to right, rgba(46, 125, 50, 0.15) 0%, #1F2937 20%);
        }
        &.toast-error { 
          background: linear-gradient(to right, rgba(220, 38, 38, 0.15) 0%, #1F2937 20%);
        }
        &.toast-warning { 
          background: linear-gradient(to right, rgba(245, 158, 11, 0.15) 0%, #1F2937 20%);
        }
        &.toast-info { 
          background: linear-gradient(to right, rgba(59, 130, 246, 0.15) 0%, #1F2937 20%);
        }
      }

      .toast-title {
        color: #F9FAFB;
      }

      .toast-message {
        color: #D1D5DB;
      }

      .toast-close {
        color: #9CA3AF;

        &:hover {
          background: #374151;
          color: #F9FAFB;
        }
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .toast-container,
      .toast,
      .toast-close {
        animation: none !important;
        transition: none !important;
      }
    }
  `]
})
export class ToastComponent {
  @Input() show = false;
  @Input() type: 'success' | 'error' | 'warning' | 'info' = 'info';
  @Input() title = '';
  @Input() message = '';
  @Output() close = new EventEmitter<void>();

  getIcon(): string {
    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    return icons[this.type];
  }

  onClose(): void {
    this.close.emit();
  }
}