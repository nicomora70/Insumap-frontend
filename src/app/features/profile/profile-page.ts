import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideCheck, LucideCopy, LucideKeyRound, LucideLogOut } from '@lucide/angular';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { LinksStore } from '../../core/data/links.store';
import { MapStore } from '../../core/data/map.store';
import { ToastService } from '../../core/data/toast.service';
import type { GridSize } from '../../core/data/map.store';
import type { LinkCodeOut } from '../../core/data/types';
import { PATIENT_TABS } from '../../core/nav';
import { AppShell } from '../../shared/shell/app-shell';
import { UiAvatar } from '../../shared/ui/avatar';
import { UiBtn } from '../../shared/ui/button';
import { INPUT_CLASS } from '../../shared/ui/classes';

/** P09: perfil, tamaño de cuadrícula, vínculos con el médico y sesión (HU-02/24/22). */
@Component({
  selector: 'app-profile-page',
  imports: [AppShell, UiAvatar, UiBtn, LucideKeyRound, LucideCopy, LucideCheck, LucideLogOut],
  template: `
    <app-shell
      [title]="userName()"
      greeting="Hola,"
      [userName]="userName()"
      [tabs]="tabs"
      active="perfil"
      profileRoute="/perfil"
    >
      <main class="page-enter space-y-3 px-4 pt-3 lg:px-8">
        <section class="card flex items-center gap-4 p-4 sm:p-5" aria-label="Tu cuenta">
          <ui-avatar [name]="userName()" [size]="56" />
          <div class="min-w-0">
            <p class="truncate text-[19px] font-black">{{ userName() }}</p>
            <p class="truncate text-[14px] font-semibold text-muted dark:text-muted-dark">
              {{ user()?.email }} · {{ user()?.role === 'DOCTOR' ? 'Médico' : 'Paciente' }}
            </p>
          </div>
        </section>

        <section class="card p-4 sm:p-5" aria-label="Tamaño de la cuadrícula">
          <h2 class="text-[17px]">Cuadrícula por lado</h2>
          <p class="mt-0.5 text-[13px] font-semibold text-muted dark:text-muted-dark">
            Cambiarla reproyecta tu historial a la nueva cuadrícula.
          </p>
          <div class="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Tamaño de cuadrícula">
            @for (n of gridSizes; track n) {
              <button
                type="button"
                [attr.aria-pressed]="gridSize() === n"
                [disabled]="mapStore.gridPending()"
                (click)="setGrid(n)"
                [class]="gridCls(n)"
              >
                {{ n }}×{{ n }}
              </button>
            }
          </div>
          @if (gridError(); as msg) {
            <p role="alert" class="mt-2 text-[14px] font-bold text-mz-red">{{ msg }}</p>
          }
        </section>

        <section class="card p-4 sm:p-5" aria-label="Compartir con mi médico">
          <h2 class="flex items-center gap-2 text-[17px]">
            <svg lucideKeyRound [size]="18" class="text-primary dark:text-primary-dark" aria-hidden="true"></svg>
            Compartir con mi médico
          </h2>
          <p class="mt-0.5 text-[13px] font-semibold text-muted dark:text-muted-dark">
            Genera un código de un solo uso, válido 48 h.
          </p>
          @if (code(); as c) {
            <div class="mt-2 flex items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 dark:bg-white/10">
              <p
                class="flex-1 text-center font-mono text-[22px] font-black tracking-[0.2em] text-primary-ink dark:text-primary-dark"
              >
                {{ c.code }}
              </p>
              <button
                type="button"
                aria-label="Copiar código"
                (click)="copyCode(c.code)"
                class="pressable focus-ring touch-target w-11 shrink-0 cursor-pointer rounded-2xl text-primary-ink dark:text-primary-dark"
              >
                @if (copied()) {
                  <svg lucideCheck [size]="20" class="mx-auto" aria-hidden="true"></svg>
                } @else {
                  <svg lucideCopy [size]="20" class="mx-auto" aria-hidden="true"></svg>
                }
              </button>
            </div>
          } @else {
            <button
              uiBtn
              type="button"
              [extraClass]="'mt-2 w-full'"
              [disabled]="links.creating()"
              (click)="generateCode()"
            >
              {{ links.creating() ? 'Generando…' : 'Generar código' }}
            </button>
          }
          @if (codeError(); as msg) {
            <p role="alert" class="mt-2 text-[14px] font-bold text-mz-red">{{ msg }}</p>
          }
          @if (doctors().length > 0) {
            <ul class="mt-3 space-y-2">
              @for (link of doctors(); track link.id) {
                <li
                  class="flex items-center justify-between gap-2 rounded-2xl bg-primary-soft/70 px-3 py-2 dark:bg-white/10"
                >
                  <span class="text-[14px] font-bold">{{ link.doctor_name }}</span>
                  <button
                    type="button"
                    [disabled]="links.revoking()"
                    (click)="revoke(link.id)"
                    class="pressable focus-ring shrink-0 cursor-pointer rounded-xl px-3 py-2 text-[13px] font-extrabold text-mz-red"
                  >
                    Revocar
                  </button>
                </li>
              }
            </ul>
          }
        </section>

        <button uiBtn variant="danger-soft" type="button" [extraClass]="'w-full'" (click)="logout()">
          <svg lucideLogOut [size]="18" aria-hidden="true"></svg>
          Cerrar sesión
        </button>
      </main>
    </app-shell>
  `,
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly links = inject(LinksStore);
  protected readonly mapStore = inject(MapStore);

  protected readonly tabs = PATIENT_TABS;
  protected readonly inputClass = INPUT_CLASS;
  protected readonly gridSizes: GridSize[] = [2, 4, 6];

  protected readonly user = this.auth.user;
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Insumap');
  protected readonly gridSize = this.mapStore.gridSize;
  protected readonly gridError = signal<string | null>(null);
  protected readonly code = signal<LinkCodeOut | null>(null);
  protected readonly codeError = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly doctors = computed(() => this.links.links().filter((l) => l.doctor_name));

  constructor() {
    this.mapStore.load();
    this.links.load();
  }

  protected gridCls(n: GridSize): string {
    const on = this.gridSize() === n;
    return `touch-target pressable focus-ring cursor-pointer rounded-2xl text-[16px] font-extrabold disabled:opacity-60 ${
      on
        ? 'bg-primary text-white'
        : 'bg-primary-soft text-primary-ink dark:bg-white/10 dark:text-primary-dark'
    }`;
  }

  protected setGrid(n: GridSize): void {
    if (n === this.gridSize()) return;
    this.gridError.set(null);
    this.mapStore.setGridSize(n).subscribe({
      error: (err: unknown) => this.gridError.set(toApiError(err).message),
    });
  }

  protected generateCode(): void {
    this.codeError.set(null);
    this.links.createCode().subscribe({
      next: (code) => {
        this.code.set(code);
        this.copied.set(false);
      },
      error: (err: unknown) => this.codeError.set(toApiError(err).message),
    });
  }

  protected copyCode(code: string): void {
    void navigator.clipboard?.writeText(code).then(
      () => {
        this.copied.set(true);
        this.toast.show('Código copiado.', false, 3_000);
      },
      () => this.copied.set(false),
    );
  }

  protected revoke(linkId: string): void {
    this.links.revoke(linkId).subscribe({
      error: (err: unknown) => this.codeError.set(toApiError(err).message),
    });
  }

  protected logout(): void {
    this.auth.logout().subscribe(() => {
      void this.router.navigateByUrl('/login', { replaceUrl: true });
    });
  }
}
