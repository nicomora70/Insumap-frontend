import { Component, computed, inject, input, output, signal } from '@angular/core';
import { LucideTriangleAlert } from '@lucide/angular';
import { toApiError } from '../../core/api/api-error';
import { MapStore } from '../../core/data/map.store';
import type { CellColor, CellOut } from '../../core/data/types';
import { COLOR_WORD, formatAppliedAt } from '../../core/util/format';
import { UiBtn } from '../../shared/ui/button';
import { INPUT_SM } from '../../shared/ui/classes';
import { UiPill } from '../../shared/ui/status-pill';
import { UiRing } from '../../shared/ui/ring';
import type { RingTone } from '../../shared/ui/ring';
import { UiSheet } from '../../shared/ui/sheet';

export interface RegisteredEvent {
  injectionId: string;
  microzoneId: string;
  canUndo: boolean;
}

const MACRO_NAME: Record<string, string> = {
  ABD: 'Abdomen',
  MUS: 'Muslo',
  BRA: 'Brazo',
  GLU: 'Glúteo',
};

/** P05: hoja inferior de la microzona con registro y advertencia (R04). */
@Component({
  selector: 'app-microzone-sheet',
  imports: [UiBtn, UiSheet, UiRing, UiPill, LucideTriangleAlert],
  template: `
    <ui-sheet [label]="'Microzona ' + cell().id" (closed)="close.emit()">
      <p class="text-small text-muted">{{ header() }}</p>
      <div class="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h2 class="tnum text-h2 text-ink-strong">{{ cell().id }}</h2>
        <ui-pill [color]="cell().color" />
      </div>

      <div class="mt-5 flex items-center gap-4 rounded-3xl bg-sand/70 p-4">
        <ui-ring [value]="pct()" label="recuperación" [size]="92" [tone]="ringTone()" />
        <div class="min-w-0">
          <p class="text-title font-medium text-ink-strong">{{ availability() }}</p>
          <p class="mt-1 text-small leading-relaxed text-muted">{{ lastText() }}</p>
          <p class="text-small text-muted">{{ cell().uses_30d }} usos en 30 días</p>
        </div>
      </div>

      @if (!warn()) {
        <div class="mt-5">
          <p class="text-small font-medium text-ink">Hora de aplicación</p>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              [attr.aria-pressed]="timeMode() === 'now'"
              (click)="timeMode.set('now')"
              [class]="timeBtnCls('now')"
            >
              Ahora
            </button>
            <input
              type="datetime-local"
              aria-label="Elegir hora de aplicación"
              [value]="customTime()"
              (change)="onCustomTime($event)"
              [class]="inputSm + ' min-w-0'"
            />
          </div>
        </div>
        @if (error(); as msg) {
          <p role="alert" class="mt-2.5 text-small font-medium text-mz-red">{{ msg }}</p>
        }
        <button
          uiBtn
          type="button"
          [extraClass]="'mt-5 w-full'"
          [disabled]="map.registerPending()"
          (click)="onRegisterClick()"
        >
          {{ map.registerPending() ? 'Registrando…' : 'Registrar inyección' }}
        </button>
      } @else {
        <div class="mt-5 rounded-3xl border border-olive/15 bg-honey-soft p-4">
          <p class="flex items-center gap-2 text-small font-semibold text-olive">
            <svg lucideTriangleAlert [size]="18" [strokeWidth]="2.2" aria-hidden="true"></svg>
            Esta zona aún se recupera
          </p>
          <p class="mt-2 text-small leading-relaxed text-olive">
            Puedes usarla igual, pero te sugerimos {{ suggestedId() ?? 'otra microzona' }}.
            <span class="tnum">({{ colorWord() }})</span>
          </p>
        </div>
        @if (error(); as msg) {
          <p role="alert" class="mt-2.5 text-small font-medium text-mz-red">{{ msg }}</p>
        }
        <div class="mt-5 space-y-2">
          @if (suggestedId(); as suggested) {
            <button
              uiBtn
              type="button"
              [extraClass]="'w-full'"
              (click)="useSuggested.emit(suggested)"
            >
              Usar sugerida ({{ suggested }})
            </button>
          }
          <button
            uiBtn
            variant="soft"
            type="button"
            [extraClass]="'w-full'"
            [disabled]="map.registerPending()"
            (click)="submit(true)"
          >
            {{ map.registerPending() ? 'Registrando…' : 'Registrar igual' }}
          </button>
          <button uiBtn variant="ghost" type="button" [extraClass]="'w-full'" (click)="warn.set(false)">
            Atrás
          </button>
        </div>
      }
    </ui-sheet>
  `,
})
export class MicrozoneSheet {
  protected readonly map = inject(MapStore);

  readonly cell = input.required<CellOut>();
  readonly gridSize = input.required<number>();
  readonly suggestedId = input<string | null>(null);

  readonly close = output<void>();
  readonly registered = output<RegisteredEvent>();
  readonly useSuggested = output<string>();

  protected readonly warn = signal(false);
  protected readonly timeMode = signal<'now' | 'custom'>('now');
  protected readonly customTime = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly inputSm = INPUT_SM;

  protected readonly pct = computed(() => Math.min(100, Math.round(this.cell().ratio * 100)));
  protected readonly hoursRounded = computed(() => Math.round(this.cell().hours_remaining));
  protected readonly colorWord = computed(() => COLOR_WORD[this.cell().color]);
  protected readonly ringTone = computed<RingTone>(() => {
    const color: CellColor = this.cell().color;
    return color === 'RED' ? 'red' : color === 'YELLOW' ? 'yellow' : 'green';
  });
  protected readonly availability = computed(() =>
    this.cell().hours_remaining <= 0
      ? 'Disponible ahora'
      : `Disponible en ~${this.hoursRounded()} h`,
  );
  protected readonly lastText = computed(() => {
    const last = this.cell().last_used;
    if (!last) return 'Nunca usada';
    const { date, time } = formatAppliedAt(last);
    return `Último uso: ${date} ${time}`;
  });
  protected readonly header = computed(() => {
    const [macro, side, row, col] = this.cell().id.split('-');
    const sideLabel = side === 'I' ? 'izq.' : 'der.';
    return `${MACRO_NAME[macro] ?? macro} ${sideLabel} · F${row} C${col} · ${this.gridSize()}×${this.gridSize()}`;
  });

  protected timeBtnCls(mode: 'now' | 'custom'): string {
    const on = this.timeMode() === mode;
    return `touch-target focus-ring cursor-pointer rounded-2xl border text-body font-medium transition-colors ${
      on
        ? 'border-primary bg-primary text-cream shadow-[inset_0_1px_0_rgb(255_227_209/0.2)]'
        : 'border-line bg-card text-ink-soft hover:bg-sand'
    }`;
  }

  protected onCustomTime(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.customTime.set(value);
    if (value) this.timeMode.set('custom');
  }

  protected onRegisterClick(): void {
    if (this.cell().color === 'GREEN') this.submit(false);
    else this.warn.set(true);
  }

  protected submit(confirm: boolean): void {
    if (this.map.registerPending()) return;
    const at = this.appliedAt();
    if (!at.ok) return;
    this.error.set(null);
    this.map
      .register({
        microzone_id: this.cell().id,
        confirm_not_recovered: confirm,
        origin: 'MAP',
        applied_at: at.value,
      })
      .subscribe({
        next: (res) =>
          this.registered.emit({
            injectionId: res.injection.id,
            microzoneId: this.cell().id,
            canUndo: res.can_undo,
          }),
        error: (err: unknown) => {
          const e = toApiError(err);
          if (e.code === 'MICROZONE_NOT_RECOVERED') this.warn.set(true);
          else this.error.set(e.message);
        },
      });
  }

  private appliedAt(): { ok: true; value: string | null } | { ok: false } {
    if (this.timeMode() === 'now') return { ok: true, value: null };
    const value = this.customTime();
    if (!value) {
      this.error.set('Elige una hora o usa «Ahora».');
      return { ok: false };
    }
    const chosen = new Date(value);
    if (chosen.getTime() > Date.now()) {
      this.error.set('La hora no puede estar en el futuro.');
      return { ok: false };
    }
    return { ok: true, value: chosen.toISOString() };
  }
}
