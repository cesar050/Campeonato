import { Routes } from '@angular/router';
import { authGuard, guestGuard, superadminGuard } from './core/guards/auth.guard';
import { organizadorGuard } from './core/guards/organizador.guard';
import { liderGuard } from './core/guards/lider.guard';

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
        path: 'verify-email',
        loadComponent: () =>
          import('./features/auth/components/verify-email/verify-email.component').then(m => m.VerifyEmailComponent)
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
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/superadmin/components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'organizadores',
        loadComponent: () =>
          import('./features/superadmin/components/organizadores/organizadores.component').then(m => m.OrganizadoresComponent)
      },
      {
        path: 'organizadores/:id',
        loadComponent: () =>
          import('./features/superadmin/components/organizador-detalle/organizador-detalle.component').then(m => m.OrganizadorDetalleComponent)
      },
      {
        path: 'campeonatos',
        loadComponent: () =>
          import('./features/superadmin/components/campeonatos/campeonatos.component').then(m => m.CampeonatosComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/superadmin/components/usuarios/usuarios.component').then(m => m.UsuariosComponent)
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/superadmin/components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/superadmin/components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      }
    ]
  },

  // ORGANIZADOR
  {
    path: 'organizador',
    loadComponent: () =>
      import('./features/organizador/organizador.component').then(m => m.OrganizadorComponent),
    canActivate: [authGuard, organizadorGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/organizador/components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'crear-campeonato',
        loadComponent: () =>
          import('./features/organizador/components/crear-campeonato/crear-campeonato.component').then(m => m.CrearCampeonatoComponent)
      },
      {
        path: 'mi-campeonato',
        loadComponent: () =>
          import('./features/organizador/components/mi-campeonato/mi-campeonato.component').then(m => m.MiCampeonatoComponent)
      },
      {
        path: 'ver-solicitudes/:idCampeonato',
        loadComponent: () => import('./features/organizador/components/ver-solicitudes/ver-solicitudes.component')
          .then(m => m.VerSolicitudesComponent)
      },
      {
        path: 'revisar-solicitud/:idCampeonato/:idInscripcion',
        loadComponent: () => import('./features/organizador/components/revisar-solicitud/revisar-solicitud.component')
          .then(m => m.RevisarSolicitudComponent)
      },
      {
        path: 'generar-fixture/:idCampeonato',
        loadComponent: () => import('./features/organizador/components/generar-fixture/generar-fixture.component')
          .then(m => m.GenerarFixtureComponent)
      },
      {
        path: 'equipos',
        loadComponent: () =>
          import('./features/organizador/components/equipos/equipos.component').then(m => m.EquiposComponent)
      },
      {
        path: 'equipos/:id',
        loadComponent: () =>
          import('./features/organizador/components/equipo-detalle/equipo-detalle.component').then(m => m.EquipoDetalleComponent)
      },
      {
        path: 'partidos',
        loadComponent: () =>
          import('./features/organizador/components/partidos/partidos.component').then(m => m.PartidosComponent)
      },
      {
        path: 'partidos/:id',
        loadComponent: () =>
          import('./features/organizador/components/partido-detalle/partido-detalle.component').then(m => m.PartidoDetalleComponent)
      },
      {
        path: 'tabla-posiciones',
        loadComponent: () =>
          import('./features/organizador/components/tabla-posiciones/tabla-posiciones.component').then(m => m.TablaPosicionesComponent)
      },
      {
        path: 'estadisticas',
        loadComponent: () =>
          import('./features/organizador/components/estadisticas/estadisticas.component').then(m => m.EstadisticasComponent)
      }
    ]
  },

  // ============================================
  // LÍDER DE EQUIPO
  // ============================================
  {
    path: 'lider-equipo',
    loadComponent: () =>
      import('./features/lider-equipo/lider-equipo.component').then(m => m.LiderEquipoComponent),
    canActivate: [authGuard, liderGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/lider-equipo/components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'mis-equipos',
        loadComponent: () =>
          import('./features/lider-equipo/components/mis-equipos/mis-equipos.component').then(m => m.MisEquiposComponent)
      },
      {
        path: 'jugadores',
        loadComponent: () =>
          import('./features/lider-equipo/components/jugadores/jugadores.component').then(m => m.JugadoresComponent)
      },
      {
        path: 'partidos',
        loadComponent: () =>
          import('./features/lider-equipo/components/partidos/partidos.component').then(m => m.PartidosComponent)
      },
      {
        path: 'partidos/:id',
        loadComponent: () =>
          import('./features/lider-equipo/components/partido-detalle/partido-detalle.component').then(m => m.PartidoDetalleLiderComponent)
      },
      {
        path: 'alineaciones',
        loadComponent: () =>
          import('./features/lider-equipo/components/alineaciones/alineaciones.component').then(m => m.AlineacionesComponent)
      },
      {
        path: 'formaciones',
        loadComponent: () =>
          import('./features/lider-equipo/components/formaciones/formaciones.component')
            .then(m => m.FormacionesComponent)
      },
      {
        path: 'estadisticas',
        loadComponent: () =>
          import('./features/lider-equipo/components/estadisticas/estadisticas.component').then(m => m.EstadisticasComponent)
      },
      {
        path: 'notificaciones',
        loadComponent: () =>
          import('./features/lider-equipo/components/notificaciones/notificaciones.component').then(m => m.NotificacionesComponent)
      },
      {
        path: 'campeonatos-disponibles',
        loadComponent: () =>
          import('./features/lider-equipo/components/campeonatos-disponibles/campeonatos-disponibles.component').then(m => m.CampeonatosDisponiblesComponent)
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