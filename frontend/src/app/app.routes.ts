import { Routes } from '@angular/router';
import { authGuard, guestGuard, superadminGuard } from './core/guards/auth.guard';
import { organizadorGuard } from './core/guards/organizador.guard';

export const routes: Routes = [
  // Landing page
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then(m => m.LandingComponent),
    canActivate: [guestGuard]
  },

  // Auth
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/components/login/login.component').then(m => m.LoginComponent),
        canActivate: [guestGuard]
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/components/register/register.component').then(m => m.RegisterComponent),
        canActivate: [guestGuard]
      },
      {
        path: 'unlock',
        loadComponent: () =>
          import('./features/auth/components/unlock-account/unlock-account.component').then(m => m.UnlockAccountComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },

  // Super Admin
  {
    path: 'superadmin',
    loadComponent: () =>
      import('./features/superadmin/superadmin.component').then(m => m.SuperadminComponent),
    canActivate: [authGuard, superadminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/superadmin/components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'organizadores',
        loadComponent: () =>
          import('./features/superadmin/components/organizadores/organizadores.component').then(m => m.OrganizadoresComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  // ORGANIZADOR
  {
    path: 'organizador',
    loadComponent: () => import('./features/organizador/organizador.component').then(m => m.OrganizadorComponent),
    canActivate: [authGuard, organizadorGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/organizador/components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'crear-campeonato',
        loadComponent: () => import('./features/organizador/components/crear-campeonato/crear-campeonato.component').then(m => m.CrearCampeonatoComponent)
      },
      {
        path: 'mi-campeonato',
        loadComponent: () => import('./features/organizador/components/mi-campeonato/mi-campeonato.component').then(m => m.MiCampeonatoComponent)
      },
      {
        path: 'equipos',
        loadComponent: () => import('./features/organizador/components/equipos/equipos.component').then(m => m.EquiposComponent)
      },
      {
        path: 'equipos/:id',
        loadComponent: () => import('./features/organizador/components/equipo-detalle/equipo-detalle.component').then(m => m.EquipoDetalleComponent)
      },
      {
        path: 'partidos',
        loadComponent: () => import('./features/organizador/components/partidos/partidos.component').then(m => m.PartidosComponent)
      },
      {
        path: 'tabla-posiciones',
        loadComponent: () => import('./features/organizador/components/tabla-posiciones/tabla-posiciones.component').then(m => m.TablaPosicionesComponent)
      },
      {
        path: 'estadisticas',
        loadComponent: () => import('./features/organizador/components/estadisticas/estadisticas.component').then(m => m.EstadisticasComponent)
      }
    ]
  },


  // Dashboard general (para otros roles)
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },

  // 404
  {
    path: '**',
    redirectTo: ''
  }
];