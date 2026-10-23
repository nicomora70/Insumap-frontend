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
import { UiSegmented } from '../../shared/ui/segmented';
import type { SegmentOption } from '../../shared/ui/segmented';

/** P09: perfil, tamaño de cuadrícula, vínculos con el médico y sesión (HU-02/24/22). */
@Component({
  selector: 'app-profile-page',
  imports: [AppShell, UiAvatar, UiBtn, UiSegmented, LucideKeyRound, LucideCopy, LucideCheck, LucideLogOut],
  template: `
    <app-shell
      [userName]="userName()"
      [tabs]="tabs"
      active="perfil"
      profileRoute="/perfil"
    >
      <main class="page-enter space-y-3">
        <h1 class="text-h1 font-normal text-ink-strong">
          Tu cuenta
        </h1>
        <section class="card flex items-center gap-4 p-5" aria-label="Tu cuenta">
          <ui-avatar [name]="userName()" [size]="56" />
          <div class="min-w-0">
            <p class="truncate text-h3 font-medium text-ink-strong">{{ userName() }}</p>
            <p class="truncate text-small text-muted">
              {{ user()?.email }} · {{ user()?.role === 'DOCTOR' ? 'Médico' : 'Paciente' }}
            </p>
          </div>
        </section>

        <section class="card p-5" aria-label="Tamaño de la cuadrícula">
          <h2 class="text-title text-ink-strong">Cuadrícula por lado</h2>
          <p class="mt-1 text-small text-muted">
            Cambiarla reproyecta tu historial a la nueva cuadrícula.
          </p>
          <div class="mt-4">
            <ui-segmented
              [options]="gridOptions"
              [value]="gridValue()"
              label="Tamaño de cuadrícula"
              [disabled]="mapStore.gridPending()"
              (changed)="setGridOption($event)"
            />
          </div>
          @if (gridError(); as msg) {
            <p role="alert" class="mt-2.5 text-small font-medium text-mz-red">{{ msg }}</p>
          }
        </section>

        <section class="card p-5" aria-label="Compartir con mi médico">
          <h2 class="flex items-center gap-2 text-title text-ink-strong">
            <svg lucideKeyRound [size]="17" aria-hidden="true"></svg>
            Compartir con mi médico
          </h2>
          <p class="mt-1 text-small text-muted">Genera un código de un solo uso, válido 48 h.</p>
          @if (code(); as c) {
            <div class="mt-3 flex items-center gap-2 rounded-2xl bg-sand px-5 py-3.5">
              <p class="flex-1 text-center font-mono text-h3 font-medium tracking-[0.2em] text-ink-strong">
                {{ c.code }}
              </p>
              <button
                type="button"
                aria-label="Copiar código"
                (click)="copyCode(c.code)"
                class="pressable focus-ring touch-target w-10 shrink-0 cursor-pointer rounded-full text-ink"
              >
                @if (copied()) {
                  <svg lucideCheck [size]="19" class="mx-auto" aria-hidden="true"></svg>
                } @else {
                  <svg lucideCopy [size]="19" class="mx-auto" aria-hidden="true"></svg>
                }
              </button>
            </div>
          } @else {
            <button
              uiBtn
              type="button"
              [extraClass]="'mt-3 w-full py-3'"
              [disabled]="links.creating()"
              (click)="generateCode()"
            >
              {{ links.creating() ? 'Generando…' : 'Generar código' }}
            </button>
          }
          @if (codeError(); as msg) {
            <p role="alert" class="mt-2.5 text-small font-medium text-mz-red">{{ msg }}</p>
          }
          @if (doctors().length > 0) {
            <ul class="mt-4 divide-y divide-line border-t border-line">
              @for (link of doctors(); track link.id) {
                <li class="flex items-center justify-between gap-2 py-3">
                  <span class="text-small font-medium text-ink">{{ link.doctor_name }}</span>
                  <button
                    type="button"
                    [disabled]="links.revoking()"
                    (click)="revoke(link.id)"
                    class="pressable focus-ring shrink-0 cursor-pointer rounded-full px-3 py-2 text-small font-medium text-mz-red disabled:opacity-50"
                  >
                    Revocar
                  </button>
                </li>
              }
            </ul>
          }
        </section>

        <button uiBtn variant="outline" type="button" [extraClass]="'w-full py-3 text-mz-red'" (click)="logout()">
          <svg lucideLogOut [size]="17" aria-hidden="true"></svg>
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
  protected readonly gridOptions: SegmentOption[] = [
    { id: '2', label: '2×2' },
    { id: '4', label: '4×4' },
    { id: '6', label: '6×6' },
  ];
  protected readonly gridValue = computed(() => String(this.gridSize()));

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

  protected setGridOption(id: string): void {
    const n = Number(id);
    if (n === 2 || n === 4 || n === 6) this.setGrid(n as GridSize);
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
