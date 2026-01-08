import { Component, ViewChild, AfterViewInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-organizador',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './organizador.component.html',
  styleUrls: ['./organizador.component.scss']
})
export class OrganizadorComponent implements AfterViewInit {
  @ViewChild(SidebarComponent) sidebar?: SidebarComponent;
  isSidebarCollapsed = signal(false);
  
  ngAfterViewInit(): void {
    if (this.sidebar) {
      // Usar effect o interval para detectar cambios
      const checkCollapsed = () => {
        if (this.sidebar) {
          this.isSidebarCollapsed.set(this.sidebar.isCollapsed());
        }
      };
      
      // Verificar cada 100ms para detectar cambios
      setInterval(checkCollapsed, 100);
    }
  }
}