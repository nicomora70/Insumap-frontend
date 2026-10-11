import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

const homeOf = (role: string | null | undefined): string =>
  role === 'DOCTOR' ? '/pacientes' : '/mapa';

/** Rutas privadas: sin sesión → login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.user()) return true;
  return router.createUrlTree(['/login']);
};

/** Rutas del paciente: los médicos van a su lista de pacientes. */
export const patientGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) return router.createUrlTree(['/login']);
  if (user.role === 'DOCTOR') return router.createUrlTree(['/pacientes']);
  return true;
};

/** Rutas del médico: los pacientes vuelven a su mapa. */
export const doctorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) return router.createUrlTree(['/login']);
  if (user.role !== 'DOCTOR') return router.createUrlTree(['/mapa']);
  return true;
};

/** Login/registro: con sesión vigente entra directo a su pantalla inicial. */
export const publicOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) return true;
  return router.createUrlTree([homeOf(user.role)]);
};
