import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibilityService, AccessibilityPreferences } from '../../../core/services/accessibility.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-accessibility-center',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './accessibility-center.component.html',
  styleUrls: ['./accessibility-center.component.scss']
})
export class AccessibilityCenterComponent {
  private accessibilityService = inject(AccessibilityService);

  showConfirmReset = signal(false);

  // Acceso directo a las preferencias del servicio (se aplican inmediatamente)
  readonly darkMode = this.accessibilityService.darkMode;
  readonly highContrast = this.accessibilityService.highContrast;
  readonly fontSize = this.accessibilityService.fontSize;
  readonly reduceMotion = this.accessibilityService.reduceMotion;
  readonly enhancedFocus = this.accessibilityService.enhancedFocus;
  readonly colorblind = this.accessibilityService.colorblind;

  // Opciones de tamaño de fuente
  readonly fontSizeOptions = [
    { value: 'normal', label: 'Normal', icon: 'text_fields' },
    { value: 'large', label: 'Grande', icon: 'format_size' },
    { value: 'xlarge', label: 'Muy Grande', icon: 'title' },
    { value: 'xxlarge', label: 'Extra Grande', icon: 'view_headline' }
  ] as const;

  toggleDarkMode(): void {
    // Aplicar inmediatamente
    this.accessibilityService.toggleDarkMode();
  }

  toggleHighContrast(): void {
    this.accessibilityService.toggleHighContrast();
  }

  setFontSize(size: 'normal' | 'large' | 'xlarge' | 'xxlarge'): void {
    this.accessibilityService.setFontSize(size);
  }

  toggleReduceMotion(): void {
    this.accessibilityService.toggleReduceMotion();
  }

  toggleEnhancedFocus(): void {
    this.accessibilityService.toggleEnhancedFocus();
  }

  setColorblind(mode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'): void {
    this.accessibilityService.setColorblind(mode);
  }

  applyChanges(): void {
    // Ya no es necesario, los cambios se aplican inmediatamente
    // Este método se mantiene por si se quiere agregar alguna lógica adicional
  }

  resetPreferences(): void {
    this.showConfirmReset.set(true);
  }

  confirmReset(confirmed: boolean): void {
    if (confirmed) {
      this.accessibilityService.resetPreferences();
    }
    this.showConfirmReset.set(false);
  }
  
  readonly colorblindOptions = [
    { value: 'none', label: 'Ninguno', description: 'Colores normales' },
    { value: 'protanopia', label: 'Protanopia', description: 'Dificultad con rojos' },
    { value: 'deuteranopia', label: 'Deuteranopia', description: 'Dificultad con verdes' },
    { value: 'tritanopia', label: 'Tritanopia', description: 'Dificultad con azules' }
  ] as const;
}

