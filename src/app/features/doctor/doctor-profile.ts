import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideLogOut } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { DOCTOR_TABS } from '../../core/nav';
import { AppShell } from '../../shared/shell/app-shell';
import { UiAvatar } from '../../shared/ui/avatar';
import { UiBtn } from '../../shared/ui/button';

/** Perfil del médico: cuenta y cierre de sesión. */
@Component({
  selector: 'app-doctor-profile',
  imports: [AppShell, UiAvatar, UiBtn, LucideLogOut],
  template: `
    <app-shell
      [title]="userName()"
      greeting="Hola,"
      [userName]="userName()"
      [tabs]="tabs"
      active="perfil"
      profileRoute="/cuenta"
    >
      <main class="page-enter space-y-3 px-4 pt-3 lg:px-8">
        <section class="card flex items-center gap-4 p-4 sm:p-5" aria-label="Tu cuenta">
          <ui-avatar [name]="userName()" [size]="56" />
          <div class="min-w-0">
            <p class="truncate text-[19px] font-black">{{ userName() }}</p>
            <p class="truncate text-[14px] font-semibold text-muted dark:text-muted-dark">
              {{ user()?.email }} · Médico
            </p>
          </div>
        </section>
        <button uiBtn variant="danger-soft" type="button" [extraClass]="'w-full'" (click)="logout()">
          <svg lucideLogOut [size]="18" aria-hidden="true"></svg>
          Cerrar sesión
        </button>
      </main>
    </app-shell>
  `,
})
export class DoctorProfilePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly tabs = DOCTOR_TABS;
  protected readonly user = this.auth.user;
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Insumap');

  protected logout(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigateByUrl('/login', { replaceUrl: true });
    });
  }
}
