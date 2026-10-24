import { Component, computed, effect, inject, input, signal } from '@angular/core';
import {
  LucideBellOff,
  LucideBellRing,
  LucideCheck,
  LucideClock,
  LucidePlus,
  LucideTrash,
} from '@lucide/angular';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { MapStore } from '../../core/data/map.store';
import { RemindersStore } from '../../core/data/reminders.store';
import { ToastService } from '../../core/data/toast.service';
import type { DoseIn, ReminderOut } from '../../core/data/types';
import { PATIENT_TABS } from '../../core/nav';
import { PushService } from '../../core/push/push.service';
import type { PushState } from '../../core/push/push.service';
import { formatDue } from '../../core/util/format';
import { AppShell } from '../../shared/shell/app-shell';
import { UiBtn } from '../../shared/ui/button';
import { INPUT_SM } from '../../shared/ui/classes';

type PushUi = 'idle' | 'working' | PushState;

/** Tarjeta de un recordatorio próximo: posponer, confirmar y registrar (HU-16). */
@Component({
  selector: 'app-reminder-card',
  imports: [UiBtn, LucideClock, LucideCheck],
  template: `
    <li [class]="cardCls()">
      <div class="flex items-center justify-between gap-2">
        <p [class]="titleCls()">{{ dueText() }}</p>
        <span [class]="pillCls()">
          <svg lucideClock [size]="13" [strokeWidth]="2.2" aria-hidden="true"></svg>
          {{ pending() ? 'Pendiente' : 'Programada' }}
        </span>
      </div>

      @if (suggested(); as zone) {
        <button
          uiBtn
          type="button"
          [variant]="featured() ? 'soft' : 'primary'"
          [extraClass]="'mt-4 w-full'"
          [disabled]="map.registerPending()"
          (click)="register(zone)"
        >
          {{ map.registerPending() ? 'Registrando…' : 'Registrar en ' + zone }}
        </button>
      } @else {
        <div class="mt-4 grid grid-cols-4 gap-2">
          @for (min of minutes; track min) {
            <button
              type="button"
              [disabled]="reminders.snoozingId() === reminder().id"
              (click)="snooze(min)"
              [class]="snoozeCls()"
            >
              +{{ min }}′
            </button>
          }
          <button
            type="button"
            [disabled]="reminders.confirmingId() === reminder().id"
            (click)="confirm()"
            class="pressable focus-ring touch-target inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-mz-green-soft px-2 text-small font-medium text-mz-green disabled:opacity-50"
          >
            <svg lucideCheck [size]="15" [strokeWidth]="2.5" aria-hidden="true"></svg>
            @if (reminders.confirmingId() === reminder().id) {
              …
            } @else {
              <span class="sm:hidden">Puesta</span>
              <span class="hidden sm:inline">La apliqué</span>
            }
          </button>
        </div>
      }

      @if (error(); as msg) {
        <p role="alert" [class]="errorCls()">{{ msg }}</p>
      }
    </li>
  `,
})
export class ReminderCard {
  protected readonly reminders = inject(RemindersStore);
  protected readonly map = inject(MapStore);
  private readonly toast = inject(ToastService);

  readonly reminder = input.required<ReminderOut>();
  readonly featured = input(false);

  protected readonly minutes = [15, 30, 60];
  protected readonly suggested = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly pending = computed(() => {
    const r = this.reminder();
    return r.status === 'SENT' || new Date(r.due_at).getTime() <= Date.now();
  });
  protected readonly dueText = computed(() => formatDue(this.reminder().due_at));

  protected cardCls(): string {
    return this.featured()
      ? 'panel-ink rounded-[2rem] p-5 text-cream sm:p-6'
      : 'card p-5';
  }

  protected titleCls(): string {
    return `text-title font-medium ${this.featured() ? 'text-cream' : 'text-ink-strong'}`;
  }

  protected pillCls(): string {
    if (this.pending()) return 'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-honey-soft px-3 py-1.5 text-caption font-semibold text-olive';
    return this.featured()
      ? 'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-caption font-semibold text-cream/70'
      : 'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-caption font-semibold text-muted';
  }

  protected snoozeCls(): string {
    if (this.featured()) {
      return 'pressable focus-ring touch-target cursor-pointer rounded-full bg-white/10 text-small font-medium text-cream transition-colors hover:bg-white/15 disabled:opacity-50';
    }
    return 'pressable focus-ring touch-target cursor-pointer rounded-full bg-sand text-small font-medium text-ink transition-colors hover:bg-sand-deep disabled:opacity-50';
  }

  protected errorCls(): string {
    return `mt-2.5 text-small font-medium ${this.featured() ? 'text-ember' : 'text-mz-red'}`;
  }

  protected snooze(minutes: number): void {
    this.error.set(null);
    this.reminders.snooze(this.reminder().id, minutes).subscribe({
      error: (err: unknown) => this.error.set(toApiError(err).message),
    });
  }

  protected confirm(): void {
    this.error.set(null);
    this.reminders.confirm(this.reminder().id).subscribe({
      next: (res) => this.suggested.set(res.suggested_microzone_id),
      error: (err: unknown) => this.error.set(toApiError(err).message),
    });
  }

  protected register(zone: string): void {
    this.error.set(null);
    this.map
      .register({ microzone_id: zone, confirm_not_recovered: false, origin: 'REMINDER' })
      .subscribe({
        next: () => {
          this.suggested.set(null);
          this.toast.show(`Registrada en ${zone}.`);
        },
        error: (err: unknown) => this.error.set(toApiError(err).message),
      });
  }
}

/** P07: cronograma de dosis, próximos recordatorios y push (HU-14/15/16). */
@Component({
  selector: 'app-doses-page',
  imports: [
    AppShell,
    UiBtn,
    ReminderCard,
    LucideClock,
    LucidePlus,
    LucideTrash,
    LucideBellRing,
    LucideBellOff,
    LucideCheck,
  ],
  template: `
    <app-shell [userName]="userName()" [tabs]="tabs" active="dosis">
      <main class="page-enter space-y-5 pb-10">
        <header>
          <p class="text-caption font-medium tracking-[0.08em] text-muted">Dosis</p>
          <h1 class="mt-2 text-h1 text-ink-strong">
            Tu ritmo, <span class="accent">a tu manera</span>.
          </h1>
          <p class="mt-3 max-w-lg text-body leading-relaxed text-muted">
            Horarios, recordatorios y la próxima dosis en un solo lugar.
          </p>
        </header>

        <!-- Próximas dosis -->
        <section aria-label="Próximas dosis" class="space-y-2">
          <div class="flex items-end justify-between gap-2">
            <h2 class="text-h3 text-ink-strong">Próximas dosis</h2>
            @if (reminders.upcoming().length > 0) {
              <span class="text-caption text-muted">{{ reminders.upcoming().length }} programadas</span>
            }
          </div>
          @if (reminders.loading() && reminders.upcoming().length === 0) {
            <div class="h-28 animate-pulse rounded-[2rem] bg-sand" aria-label="Cargando recordatorios"></div>
          } @else if (reminders.error() && reminders.upcoming().length === 0) {
            <div class="card p-5">
              <button
                uiBtn
                variant="outline"
                type="button"
                [extraClass]="'w-full'"
                (click)="reminders.refresh()"
              >
                No se pudieron cargar. Toca para reintentar.
              </button>
            </div>
          } @else if (reminders.upcoming().length === 0) {
            <div class="card p-5">
              <p class="text-small text-muted">
                Sin dosis próximas. Guarda tus horarios abajo y aparecerán aquí.
              </p>
            </div>
          } @else {
            <ul class="space-y-2">
              @for (item of reminders.upcoming(); track item.id; let first = $first) {
                <app-reminder-card [reminder]="item" [featured]="first" />
              }
            </ul>
          }
        </section>

        <!-- Cronograma -->
        <section class="card p-5" aria-label="Cronograma de dosis">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="flex items-center gap-2 text-h3 text-ink-strong">
                <svg lucideClock [size]="19" aria-hidden="true"></svg>
                Horarios
              </h2>
              <p class="mt-1 text-small text-muted">De 1 a 6 dosis al día, según tu tratamiento.</p>
            </div>
            <span class="shrink-0 rounded-full bg-sand px-3 py-1.5 text-caption font-semibold text-muted">
              {{ doses().length }} / 6
            </span>
          </div>

          @if (reminders.loading() && !reminders.schedule()) {
            <div class="mt-4 h-24 animate-pulse rounded-2xl bg-sand" aria-label="Cargando cronograma"></div>
          } @else if (reminders.error() && !reminders.schedule()) {
            <button
              uiBtn
              variant="outline"
              type="button"
              [extraClass]="'mt-4 w-full'"
              (click)="reminders.refresh()"
            >
              No se pudo cargar el cronograma. Toca para reintentar.
            </button>
          } @else {
            <ul class="mt-4 space-y-2">
              @for (dose of doses(); track $index; let i = $index) {
                <li class="flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    [attr.aria-label]="'Hora de la dosis ' + (i + 1)"
                    [value]="dose.time"
                    (change)="setTime(i, $event)"
                    [class]="inputSm + ' w-36'"
                  />
                  <input
                    [attr.aria-label]="'Nombre de la dosis ' + (i + 1)"
                    [value]="dose.label ?? ''"
                    placeholder="Ej. Antes del almuerzo"
                    (input)="setLabel(i, $event)"
                    [class]="inputSm + ' order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1'"
                  />
                  @if (doses().length > 1) {
                    <button
                      type="button"
                      [attr.aria-label]="'Quitar dosis ' + (i + 1)"
                      (click)="removeDose(i)"
                      class="pressable focus-ring touch-target order-2 ml-auto grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-mz-red-soft text-mz-red sm:order-none sm:ml-0"
                    >
                      <svg lucideTrash [size]="17" aria-hidden="true"></svg>
                    </button>
                  }
                </li>
              }
            </ul>
            @if (doses().length < 6) {
              <button
                uiBtn
                variant="outline"
                type="button"
                [extraClass]="'mt-3 w-full'"
                (click)="addDose()"
              >
                <svg lucidePlus [size]="17" aria-hidden="true"></svg>
                Agregar dosis
              </button>
            }
            @if (saveError(); as msg) {
              <p role="alert" class="mt-2.5 text-small font-medium text-mz-red">{{ msg }}</p>
            }
            <button
              uiBtn
              type="button"
              [extraClass]="'mt-4 w-full'"
              [disabled]="reminders.saving()"
              (click)="save()"
            >
              {{ reminders.saving() ? 'Guardando…' : 'Guardar horarios' }}
            </button>
          }
        </section>

        <!-- Push -->
        <section class="card flex flex-wrap items-center justify-between gap-3 p-4" aria-label="Notificaciones">
          <div class="flex min-w-0 items-center gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ember-soft text-ember-ink">
              <svg lucideBellRing [size]="18" aria-hidden="true"></svg>
            </span>
            <div class="min-w-0">
              <p class="text-small font-medium text-ink-strong">Notificaciones push</p>
              <p class="text-caption text-muted">Recibe el aviso de tu próxima dosis.</p>
            </div>
          </div>
          <button
            uiBtn
            variant="outline"
            type="button"
            [extraClass]="'w-full shrink-0 sm:w-auto'"
            [disabled]="pushState() === 'working' || pushState() === 'subscribed'"
            (click)="enablePush()"
          >
            @switch (pushState()) {
              @case ('subscribed') {
                <svg lucideCheck [size]="17" aria-hidden="true"></svg>
              }
              @case ('denied') {
                <svg lucideBellOff [size]="17" aria-hidden="true"></svg>
              }
              @case ('unsupported') {
                <svg lucideBellOff [size]="17" aria-hidden="true"></svg>
              }
              @default {
                <svg lucideBellRing [size]="17" aria-hidden="true"></svg>
              }
            }
            {{ pushText() }}
          </button>
        </section>
        <p class="px-1 text-caption leading-relaxed text-muted">
          En iPhone el push solo llega con la app instalada (iOS 16.4+). Esta lista es el respaldo
          dentro de la app.
        </p>
      </main>
    </app-shell>
  `,
})
export class DosesPage {
  private readonly auth = inject(AuthService);
  protected readonly reminders = inject(RemindersStore);
  private readonly push = inject(PushService);
  private readonly toast = inject(ToastService);

  protected readonly tabs = PATIENT_TABS;
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Insumap');
  protected readonly inputSm = INPUT_SM;

  protected readonly doses = signal<DoseIn[]>([]);
  protected readonly saveError = signal<string | null>(null);
  protected readonly pushState = signal<PushUi>('idle');

  private dosesLoaded = false;

  protected readonly pushText = computed(() => {
    switch (this.pushState()) {
      case 'working':
        return 'Activando…';
      case 'subscribed':
        return 'Activadas';
      case 'denied':
        return 'Permiso denegado';
      case 'unsupported':
        return 'No disponible';
      default:
        return 'Activar';
    }
  });

  constructor() {
    this.reminders.load();
    effect(() => {
      const schedule = this.reminders.schedule();
      if (schedule && !this.dosesLoaded) {
        this.doses.set(
          schedule.doses
            .filter((d) => d.is_active)
            .map((d) => ({ time: d.time.slice(0, 5), label: d.label ?? '' })),
        );
        this.dosesLoaded = true;
      }
    });
  }

  protected addDose(): void {
    this.doses.update((ds) => (ds.length < 6 ? [...ds, { time: '12:00', label: '' }] : ds));
  }

  protected removeDose(index: number): void {
    this.doses.update((ds) => ds.filter((_, i) => i !== index));
  }

  protected setTime(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.doses.update((ds) => ds.map((d, i) => (i === index ? { ...d, time: value } : d)));
  }

  protected setLabel(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.doses.update((ds) => ds.map((d, i) => (i === index ? { ...d, label: value } : d)));
  }

  protected save(): void {
    this.saveError.set(null);
    const clean = this.doses()
      .filter((d) => d.time)
      .map((d) => ({ time: d.time, label: d.label?.trim() ? d.label.trim() : null }));
    this.reminders.save(clean).subscribe({
      next: () => this.toast.show('Horarios guardados.', false, 4_000),
      error: (err: unknown) => this.saveError.set(toApiError(err).message),
    });
  }

  protected enablePush(): void {
    this.pushState.set('working');
    void this.push.ensureSubscription().then((state) => {
      this.pushState.set(state);
      if (state === 'subscribed') this.toast.show('Notificaciones activadas.', false, 4_000);
    });
  }
}
