import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
  @Input() show: boolean = false;
  @Input() title: string = 'Confirmar acción';
  @Input() message: string = '¿Estás seguro de realizar esta acción?';
  @Input() confirmText: string = 'Confirmar';
  @Input() cancelText: string = 'Cancelar';
  @Input() type: 'info' | 'warning' | 'danger' = 'warning';
  @Input() showInput: boolean = false;
  @Input() inputLabel: string = 'Motivo';
  @Input() inputPlaceholder: string = 'Ingresa el motivo...';
  @Input() inputValue: string = '';

  @Output() inputValueChange = new EventEmitter<string>();

  @Output() confirm = new EventEmitter<{ confirmed: boolean; inputValue?: string }>();
  @Output() cancel = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit({ 
      confirmed: true, 
      inputValue: this.showInput ? this.inputValue : undefined 
    });
    this.close.emit();
  }

  onCancel(): void {
    this.cancel.emit();
    this.close.emit();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onCancel();
    } else if (event.key === 'Enter') {
      this.onConfirm();
    }
  }

  getIcon(): string {
    const icons = {
      info: 'info',
      warning: 'warning',
      danger: 'error'
    };
    return icons[this.type];
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.inputValue = target.value;
    this.inputValueChange.emit(target.value);
  }
}

