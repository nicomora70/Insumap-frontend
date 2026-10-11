import { Routes } from '@angular/router';
import { authGuard, doctorGuard, patientGuard, publicOnlyGuard } from './core/auth/guards';

export const routes: Routes = [
  // Público (solo sin sesión)
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./features/auth/register').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./features/auth/reset-password').then((m) => m.ResetPasswordPage),
  },

  // Paciente
  {
    path: 'mapa',
    canActivate: [patientGuard],
    loadComponent: () => import('./features/map/map-page').then((m) => m.MapPage),
  },
  {
    path: 'historial',
    canActivate: [patientGuard],
    loadComponent: () => import('./features/history/history-page').then((m) => m.HistoryPage),
  },
  {
    path: 'dosis',
    canActivate: [patientGuard],
    loadComponent: () => import('./features/doses/doses-page').then((m) => m.DosesPage),
  },
  {
    path: 'ayuda',
    canActivate: [patientGuard],
    loadComponent: () =>
      import('./features/assistant/assistant-page').then((m) => m.AssistantPage),
  },
  {
    path: 'perfil',
    canActivate: [patientGuard],
    loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
  },

  // Médico
  {
    path: 'pacientes',
    canActivate: [doctorGuard],
    loadComponent: () => import('./features/doctor/doctor-page').then((m) => m.DoctorPage),
  },
  {
    path: 'cuenta',
    canActivate: [doctorGuard],
    loadComponent: () => import('./features/doctor/doctor-profile').then((m) => m.DoctorProfilePage),
  },

  // Raíz: redirige según el rol
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/role-index').then((m) => m.RoleIndex),
  },
  { path: '**', redirectTo: '' },
];
