import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

/** Entrada raíz: dirige según el rol (la sesión ya está lista por el initializer). */
@Component({
  selector: 'app-role-index',
  template: '',
})
export class RoleIndex {
  constructor() {
    const auth = inject(AuthService);
    const router = inject(Router);
    const target = auth.role() === 'DOCTOR' ? '/pacientes' : '/mapa';
    void router.navigateByUrl(target, { replaceUrl: true });
  }
}
