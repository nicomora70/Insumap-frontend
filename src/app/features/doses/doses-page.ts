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
    <li class="card p-4">
      <div class="flex items-center justify-between gap-2">
        <p class="text-[17px] font-bold">{{ dueText() }}</p>
        <span [class]="pillCls()">
          <svg lucideClock [size]="13" [strokeWidth]="2.5" aria-hidden="true"></svg>
          {{ pending() ? 'Pendiente' : 'Programada' }}
        </span>
      </div>

      @if (suggested(); as zone) {
        <button
          uiBtn
          type="button"
          [extraClass]="'mt-3 w-full'"
          [disabled]="map.registerPending()"
          (click)="register(zone)"
        >
          {{ map.registerPending() ? 'Registrando…' : 'Registrar en ' + zone }}
        </button>
      } @else {
        <div class="mt-3 grid grid-cols-4 gap-2">
          @for (min of minutes; track min) {
            <button type="button" [disabled]="reminders.snoozingId() === reminder().id" (click)="snooze(min)" [class]="snoozeCls()">
              +{{ min }}′
            </button>
          }
          <button
            type="button"
            [disabled]="reminders.confirmingId() === reminder().id"
            (click)="confirm()"
            class="pressable focus-ring touch-target inline-flex cursor-pointer items-center justify-center gap-1 rounded-2xl bg-mz-green-soft text-[14px] font-extrabold text-mz-green disabled:opacity-60 dark:bg-white/10 dark:text-[#8fe0bd]"
          >
            <svg lucideCheck [size]="16" [strokeWidth]="3" aria-hidden="true"></svg>
            {{ reminders.confirmingId() === reminder().id ? '…' : 'La apliqué' }}
          </button>
        </div>
      }

      @if (error(); as msg) {
        <p role="alert" class="mt-2 text-[14px] font-bold text-mz-red">{{ msg }}</p>
      }
    </li>
  `,
})
export class ReminderCard {
  protected readonly reminders = inject(RemindersStore);
  protected readonly map = inject(MapStore);
  private readonly toast = inject(ToastService);

  readonly reminder = input.required<ReminderOut>();

  protected readonly minutes = [15, 30, 60];
  protected readonly suggested = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly pending = computed(() => {
    const r = this.reminder();
    return r.status === 'SENT' || new Date(r.due_at).getTime() <= Date.now();
  });
  protected readonly dueText = computed(() => formatDue(this.reminder().due_at));

  protected pillCls(): string {
    return `inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${
      this.pending()
        ? 'bg-mz-yellow-soft text-mz-yellow dark:bg-white/10 dark:text-[#f2d478]'
        : 'bg-primary-soft text-primary-ink dark:bg-white/10 dark:text-primary-dark'
    }`;
  }

  protected snoozeCls(): string {
    return 'pressable focus-ring touch-target cursor-pointer rounded-2xl bg-primary-soft text-[14px] font-bold text-primary-ink disabled:opacity-60 dark:bg-white/10 dark:text-primary-dark';
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
  imports: [AppShell, UiBtn, ReminderCard, LucideClock, LucidePlus, LucideTrash, LucideBellRing, LucideBellOff, LucideCheck],
  template: `
    <app-shell
      [title]="userName()"
      greeting="Hola,"
      [userName]="userName()"
      [tabs]="tabs"
      active="dosis"
    >
      <main class="page-enter space-y-3 px-4 pb-32 pt-3 lg:px-8 lg:pb-10">
        <!-- Cronograma -->
        <section class="card p-4 sm:p-5" aria-label="Cronograma de dosis">
          <h2 class="flex items-center gap-2 text-[17px]">
            <svg lucideClock [size]="18" class="text-primary dark:text-primary-dark" aria-hidden="true"></svg>
            Horarios de mis dosis
          </h2>
          <p class="text-[13px] text-muted dark:text-muted-dark">De 1 a 6 dosis al día, según tu tratamiento.</p>

          @if (reminders.loading() && !reminders.schedule()) {
            <div class="mt-3 h-24 animate-pulse rounded-[20px] bg-primary-soft/70 dark:bg-white/10" aria-label="Cargando cronograma"></div>
          } @else if (reminders.error() && !reminders.schedule()) {
            <button uiBtn variant="soft" type="button" [extraClass]="'mt-3 w-full'" (click)="reminders.refresh()">
              No se pudo cargar el cronograma. Toca para reintentar.
            </button>
          } @else {
            <ul class="mt-3 space-y-2">
              @for (dose of doses(); track $index; let i = $index) {
                <li class="flex items-center gap-2">
                  <input
                    type="time"
                    [attr.aria-label]="'Hora de la dosis ' + (i + 1)"
                    [value]="dose.time"
                    (change)="setTime(i, $event)"
                    [class]="inputSm + ' w-32'"
                  />
                  <input
                    [attr.aria-label]="'Nombre de la dosis ' + (i + 1)"
                    [value]="dose.label ?? ''"
                    placeholder="Ej. Antes del almuerzo"
                    (input)="setLabel(i, $event)"
                    [class]="inputSm + ' min-w-0 flex-1'"
                  />
                  @if (doses().length > 1) {
                    <button
                      type="button"
                      [attr.aria-label]="'Quitar dosis ' + (i + 1)"
                      (click)="removeDose(i)"
                      class="pressable focus-ring touch-target w-11 shrink-0 cursor-pointer rounded-2xl bg-mz-red-soft text-mz-red dark:bg-white/10 dark:text-[#ff9d94]"
                    >
                      <svg lucideTrash [size]="18" class="mx-auto" aria-hidden="true"></svg>
                    </button>
                  }
                </li>
              }
            </ul>
            @if (doses().length < 6) {
              <button uiBtn variant="soft" type="button" [extraClass]="'mt-2 w-full'" (click)="addDose()">
                <svg lucidePlus [size]="18" aria-hidden="true"></svg>
                Agregar dosis
              </button>
            }
            @if (saveError(); as msg) {
              <p role="alert" class="mt-2 text-[14px] font-bold text-mz-red">{{ msg }}</p>
            }
            <button
              uiBtn
              type="button"
              [extraClass]="'mt-3 w-full'"
              [disabled]="reminders.saving()"
              (click)="save()"
            >
              {{ reminders.saving() ? 'Guardando…' : 'Guardar horarios' }}
            </button>
          }
        </section>

        <!-- Próximas dosis -->
        <section aria-label="Próximas dosis" class="space-y-2">
          <h2 class="px-1 text-[17px]">Próximas dosis</h2>
          @if (reminders.loading() && reminders.upcoming().length === 0) {
            <div class="h-24 animate-pulse rounded-[20px] bg-primary-soft/70 dark:bg-white/10" aria-label="Cargando recordatorios"></div>
          } @else if (reminders.error() && reminders.upcoming().length === 0) {
            <div class="card p-4">
              <button uiBtn variant="soft" type="button" [extraClass]="'w-full'" (click)="reminders.refresh()">
                No se pudieron cargar. Toca para reintentar.
              </button>
            </div>
          } @else if (reminders.upcoming().length === 0) {
            <div class="card p-4">
              <p class="text-[14px] text-muted dark:text-muted-dark">
                Sin dosis próximas. Guarda tus horarios arriba y aparecerán aquí.
              </p>
            </div>
          } @else {
            <ul class="space-y-2">
              @for (item of reminders.upcoming(); track item.id) {
                <app-reminder-card [reminder]="item" />
              }
            </ul>
          }
        </section>

        <!-- Push -->
        <section class="card p-4 sm:p-5">
          <button
            uiBtn
            variant="soft"
            type="button"
            [extraClass]="'w-full'"
            [disabled]="pushState() === 'working' || pushState() === 'subscribed'"
            (click)="enablePush()"
          >
            @switch (pushState()) {
              @case ('subscribed') {
                <svg lucideCheck [size]="18" aria-hidden="true"></svg>
              }
              @case ('denied') {
                <svg lucideBellOff [size]="18" aria-hidden="true"></svg>
              }
              @case ('unsupported') {
                <svg lucideBellOff [size]="18" aria-hidden="true"></svg>
              }
              @default {
                <svg lucideBellRing [size]="18" aria-hidden="true"></svg>
              }
            }
            {{ pushText() }}
          </button>
        </section>
        <p class="px-1 text-[12px] text-muted dark:text-muted-dark">
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
        return 'Notificaciones activadas en este dispositivo';
      case 'denied':
        return 'Permiso denegado: actívalo en el navegador';
      case 'unsupported':
        return 'Este navegador no soporta push';
      default:
        return 'Activar notificaciones push';
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
