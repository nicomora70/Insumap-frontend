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
      [userName]="userName()"
      [tabs]="tabs"
      active="perfil"
      profileRoute="/cuenta"
    >
      <main class="page-enter space-y-4">
        <header>
          <p class="text-caption font-medium tracking-[0.08em] text-muted">Cuenta</p>
          <h1 class="mt-2 text-h1 text-ink-strong">
            Tu cuenta, <span class="accent">en orden</span>.
          </h1>
        </header>

        <section class="panel-ink flex items-center gap-4 rounded-[2rem] p-5 sm:p-6" aria-label="Tu cuenta">
          <ui-avatar [name]="userName()" [size]="64" />
          <div class="min-w-0">
            <p class="text-h3 leading-tight break-words text-cream">{{ userName() }}</p>
            <p class="mt-1 text-small leading-relaxed break-words text-cream/65">
              {{ user()?.email }} · Médico
            </p>
          </div>
        </section>

        <button
          uiBtn
          variant="ghost"
          type="button"
          [extraClass]="'w-full justify-start text-mz-red hover:bg-mz-red-soft'"
          (click)="logout()"
        >
          <svg lucideLogOut [size]="17" aria-hidden="true"></svg>
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
