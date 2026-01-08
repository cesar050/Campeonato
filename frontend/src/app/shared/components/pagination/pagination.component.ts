import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente de paginación accesible y profesional
 * Cumple con WCAG 2.1/2.2 Nivel AA
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;
  @Input() totalItems: number = 0;
  @Input() itemsPerPage: number = 10;
  @Input() showItemsPerPage: boolean = true;
  @Input() itemsPerPageOptions: number[] = [5, 10, 20, 50];
  @Input() maxVisiblePages: number = 7;
  @Input() ariaLabel: string = 'Navegación de paginación';

  @Output() pageChange = new EventEmitter<number>();
  @Output() itemsPerPageChange = new EventEmitter<number>();

  // Computed: rango de items mostrados
  get itemsRange() {
    if (this.totalItems === 0) {
      return { start: 0, end: 0 };
    }
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return { start, end };
  }

  // Computed: páginas visibles para mostrar
  get visiblePages(): number[] {
    const pages: number[] = [];
    const max = this.maxVisiblePages;
    const current = this.currentPage;
    const total = this.totalPages;

    if (total <= max) {
      // Mostrar todas si son pocas
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Lógica inteligente para mostrar páginas relevantes
      const half = Math.floor(max / 2);
      let start = Math.max(1, current - half);
      let end = Math.min(total, start + max - 1);

      // Ajustar si estamos cerca del final
      if (end - start < max - 1) {
        start = Math.max(1, end - max + 1);
      }

      // Agregar primera página si no está visible
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push(-1); // Separador
      }

      // Páginas visibles
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Agregar última página si no está visible
      if (end < total) {
        if (end < total - 1) pages.push(-1); // Separador
        pages.push(total);
      }
    }

    return pages;
  }

  // Navegación
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  goToFirst(): void {
    if (this.currentPage > 1) {
      this.goToPage(1);
    }
  }

  goToPrevious(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToNext(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  goToLast(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.totalPages);
    }
  }

  // Cambiar items por página
  onChangeItemsPerPage(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = parseInt(target.value, 10);
    this.itemsPerPageChange.emit(value);
  }

  // Manejo de teclado
  onKeyDown(event: KeyboardEvent, action: 'first' | 'prev' | 'next' | 'last' | 'page', page?: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      switch (action) {
        case 'first':
          this.goToFirst();
          break;
        case 'prev':
          this.goToPrevious();
          break;
        case 'next':
          this.goToNext();
          break;
        case 'last':
          this.goToLast();
          break;
        case 'page':
          if (page) this.goToPage(page);
          break;
      }
    }
  }

  // Verificaciones de estado
  get isFirstPage(): boolean {
    return this.currentPage === 1;
  }

  get isLastPage(): boolean {
    return this.currentPage === this.totalPages || this.totalPages === 0;
  }

  get hasPages(): boolean {
    return this.totalPages > 1;
  }
}

