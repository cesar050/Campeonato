import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div class="header-left">
          <h1>🏆 Gestión de Campeonatos</h1>
        </div>
        <div class="header-right">
          <div class="user-info">
            <span class="user-name">{{ currentUser()?.nombre }}</span>
            <span class="user-role" [class]="currentUser()?.rol">{{ currentUser()?.rol }}</span>
          </div>
          <button class="btn-logout" (click)="logout()">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main class="dashboard-content">
        <div class="welcome-card">
          <h2>¡Bienvenido, {{ currentUser()?.nombre }}! 👋</h2>
          <p>Tu cuenta está verificada y lista para gestionar campeonatos.</p>
          
          <div class="user-details">
            <div class="detail-item">
              <span class="label">Email:</span>
              <span class="value">{{ currentUser()?.email }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Rol:</span>
              <span class="value">{{ currentUser()?.rol }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Último acceso:</span>
              <span class="value">{{ currentUser()?.last_login_at | date:'medium' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Registrado:</span>
              <span class="value">{{ currentUser()?.fecha_registro | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>

        <div class="quick-actions">
          <h3>Acciones rápidas</h3>
          <div class="actions-grid">
            @if (isAdmin() || isLider()) {
              <div class="action-card">
                <span class="action-icon">⚽</span>
                <h4>Equipos</h4>
                <p>Gestiona tus equipos</p>
              </div>
            }
            @if (isAdmin()) {
              <div class="action-card">
                <span class="action-icon">🏆</span>
                <h4>Campeonatos</h4>
                <p>Crear y administrar campeonatos</p>
              </div>
            }
            <div class="action-card">
              <span class="action-icon">📊</span>
              <h4>Estadísticas</h4>
              <p>Ver tabla de posiciones</p>
            </div>
            <div class="action-card">
              <span class="action-icon">📅</span>
              <h4>Partidos</h4>
              <p>Calendario de encuentros</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #f3f4f6;
    }

    .dashboard-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

      h1 {
        font-size: 1.5rem;
        font-weight: 700;
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .user-name {
          font-weight: 500;
        }

        .user-role {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;

          &.admin {
            background: #dc2626;
          }
          &.lider {
            background: #2563eb;
          }
          &.espectador {
            background: #6b7280;
          }
        }
      }

      .btn-logout {
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }

    .dashboard-content {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-card {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      margin-bottom: 2rem;

      h2 {
        font-size: 1.5rem;
        color: #1a1a2e;
        margin-bottom: 0.5rem;
      }

      p {
        color: #6b7280;
        margin-bottom: 1.5rem;
      }

      .user-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;

        .detail-item {
          .label {
            display: block;
            font-size: 0.8rem;
            color: #6b7280;
            margin-bottom: 0.25rem;
          }
          .value {
            font-weight: 600;
            color: #1a1a2e;
          }
        }
      }
    }

    .quick-actions {
      h3 {
        font-size: 1.25rem;
        color: #1a1a2e;
        margin-bottom: 1rem;
      }

      .actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .action-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }

        .action-icon {
          font-size: 2.5rem;
          display: block;
          margin-bottom: 0.75rem;
        }

        h4 {
          color: #1a1a2e;
          margin-bottom: 0.25rem;
        }

        p {
          font-size: 0.85rem;
          color: #6b7280;
        }
      }
    }

    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;

        .header-right {
          flex-direction: column;
          gap: 0.75rem;
        }
      }

      .dashboard-content {
        padding: 1rem;
      }
    }
  `]
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  isAdmin = this.authService.isAdmin;
  isLider = this.authService.isLider;

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        // Incluso si falla, redirigir al login
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
