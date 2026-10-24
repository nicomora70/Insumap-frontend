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
              {{ user()?.email }} · {{ user()?.role === 'DOCTOR' ? 'Médico' : 'Paciente' }}
            </p>
          </div>
        </section>

        <section class="card p-5" aria-label="Tamaño de la cuadrícula">
          <h2 class="text-h3 text-ink-strong">Cuadrícula</h2>
          <p class="mt-1 text-small leading-relaxed text-muted">
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
          <h2 class="flex items-center gap-2 text-h3 text-ink-strong">
            <svg lucideKeyRound [size]="19" aria-hidden="true"></svg>
            Compartir con mi médico
          </h2>
          <p class="mt-1 text-small leading-relaxed text-muted">
            Genera un código de un solo uso, válido 48 h.
          </p>
          @if (code(); as c) {
            <div class="panel-ink mt-4 flex items-center gap-2 rounded-2xl px-4 py-4">
              <p class="flex-1 text-center font-mono text-h2 tracking-[0.18em] text-cream">
                {{ c.code }}
              </p>
              <button
                type="button"
                aria-label="Copiar código"
                (click)="copyCode(c.code)"
                class="pressable focus-ring grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 text-cream transition-colors hover:bg-white/15"
              >
                @if (copied()) {
                  <svg lucideCheck [size]="19" aria-hidden="true"></svg>
                } @else {
                  <svg lucideCopy [size]="19" aria-hidden="true"></svg>
                }
              </button>
            </div>
          } @else {
            <button
              uiBtn
              type="button"
              [extraClass]="'mt-4 w-full'"
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
                <li class="flex items-center justify-between gap-3 py-3">
                  <span class="flex min-w-0 items-center gap-2.5">
                    <ui-avatar [name]="link.doctor_name" [size]="36" />
                    <span class="truncate text-small font-medium text-ink">{{ link.doctor_name }}</span>
                  </span>
                  <button
                    type="button"
                    [disabled]="links.revoking()"
                    (click)="revoke(link.id)"
                    class="pressable focus-ring touch-target shrink-0 cursor-pointer rounded-full px-3 text-small font-medium text-mz-red transition-colors hover:bg-mz-red-soft disabled:opacity-50"
                  >
                    Revocar
                  </button>
                </li>
              }
            </ul>
          }
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
