import { Injectable, signal, computed, effect } from '@angular/core';

export interface AccessibilityPreferences {
  darkMode: boolean;
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'xlarge' | 'xxlarge';
  reduceMotion: boolean;
  enhancedFocus: boolean;
  colorblind: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  darkMode: false,
  highContrast: false,
  fontSize: 'normal',
  reduceMotion: false,
  enhancedFocus: false,
  colorblind: 'none'
};

const STORAGE_KEY = 'campeonato-libre-accessibility-preferences';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private preferencesSignal = signal<AccessibilityPreferences>(this.loadPreferences());

  // Signals públicos
  readonly preferences = computed(() => this.preferencesSignal());
  readonly darkMode = computed(() => this.preferences().darkMode);
  readonly highContrast = computed(() => this.preferences().highContrast);
  readonly fontSize = computed(() => this.preferences().fontSize);
  readonly reduceMotion = computed(() => this.preferences().reduceMotion);
  readonly enhancedFocus = computed(() => this.preferences().enhancedFocus);
  readonly colorblind = computed(() => this.preferences().colorblind);

  constructor() {
    // Efecto para aplicar preferencias al DOM solo cuando cambian en el servicio
    effect(() => {
      this.applyPreferences(this.preferences());
    });

    // Cargar preferencias iniciales solo al inicio
    this.applyPreferences(this.preferences());

    // Escuchar evento de aplicación manual
    window.addEventListener('accessibility-preferences-applied', () => {
      this.applyPreferences(this.preferences());
    });
  }

  /**
   * Cargar preferencias desde localStorage
   */
  private loadPreferences(): AccessibilityPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Error al cargar preferencias de accesibilidad:', error);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  /**
   * Guardar preferencias en localStorage
   */
  private savePreferences(prefs: AccessibilityPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.warn('Error al guardar preferencias de accesibilidad:', error);
    }
  }

  /**
   * Aplicar preferencias al documento
   */
  private applyPreferences(prefs: AccessibilityPreferences): void {
    const root = document.documentElement;

    // Modo oscuro
    if (prefs.darkMode) {
      root.setAttribute('data-dark-mode', 'true');
      root.classList.add('dark'); // Agregar clase 'dark' para Tailwind
    } else {
      root.removeAttribute('data-dark-mode');
      root.classList.remove('dark'); // Remover clase 'dark' de Tailwind
    }

    // Alto contraste
    if (prefs.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }

    // Modo daltónicos
    if (prefs.colorblind && prefs.colorblind !== 'none') {
      root.setAttribute('data-colorblind', prefs.colorblind);
    } else {
      root.removeAttribute('data-colorblind');
    }

    // Tamaño de fuente
    root.setAttribute('data-font-size', prefs.fontSize);

    // Reducir movimiento
    if (prefs.reduceMotion) {
      root.setAttribute('data-reduce-motion', 'true');
    } else {
      root.removeAttribute('data-reduce-motion');
    }

    // Foco mejorado
    if (prefs.enhancedFocus) {
      root.setAttribute('data-enhanced-focus', 'true');
      // Aplicar estilos adicionales para foco mejorado
      const style = document.createElement('style');
      style.id = 'enhanced-focus-styles';
      style.textContent = `
        *:focus-visible {
          outline-width: 4px !important;
          outline-offset: 3px !important;
          outline-color: #2E7D32 !important;
          box-shadow: 0 0 0 4px rgba(46, 125, 50, 0.3) !important;
        }
      `;
      if (!document.getElementById('enhanced-focus-styles')) {
        document.head.appendChild(style);
      }
    } else {
      const style = document.getElementById('enhanced-focus-styles');
      if (style) {
        style.remove();
      }
      root.removeAttribute('data-enhanced-focus');
    }

    // Aplicar tamaño de fuente
    const fontSizeMap = {
      normal: '1rem',
      large: '1.25rem',
      xlarge: '1.5rem',
      xxlarge: '1.75rem'
    };
    root.style.setProperty('--font-size-base', fontSizeMap[prefs.fontSize]);
  }

  /**
   * Actualizar preferencias
   */
  updatePreferences(updates: Partial<AccessibilityPreferences>): void {
    const current = this.preferences();
    const updated = { ...current, ...updates };
    this.preferencesSignal.set(updated);
    this.savePreferences(updated);
  }

  /**
   * Restablecer a valores por defecto
   */
  resetPreferences(): void {
    this.preferencesSignal.set({ ...DEFAULT_PREFERENCES });
    this.savePreferences(DEFAULT_PREFERENCES);
  }

  /**
   * Toggle modo oscuro
   */
  toggleDarkMode(): void {
    this.updatePreferences({ darkMode: !this.darkMode() });
  }

  /**
   * Toggle alto contraste
   */
  toggleHighContrast(): void {
    this.updatePreferences({ highContrast: !this.highContrast() });
  }

  /**
   * Cambiar tamaño de fuente
   */
  setFontSize(size: 'normal' | 'large' | 'xlarge' | 'xxlarge'): void {
    this.updatePreferences({ fontSize: size });
  }

  /**
   * Toggle reducir movimiento
   */
  toggleReduceMotion(): void {
    this.updatePreferences({ reduceMotion: !this.reduceMotion() });
  }

  /**
   * Toggle foco mejorado
   */
  toggleEnhancedFocus(): void {
    this.updatePreferences({ enhancedFocus: !this.enhancedFocus() });
  }

  /**
   * Cambiar modo daltónicos
   */
  setColorblind(mode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'): void {
    this.updatePreferences({ colorblind: mode });
  }
}

