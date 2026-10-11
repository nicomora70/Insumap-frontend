import { Component, computed, inject, input, output, signal } from '@angular/core';
import { LucideTriangleAlert } from '@lucide/angular';
import { toApiError } from '../../core/api/api-error';
import { MapStore } from '../../core/data/map.store';
import type { CellColor, CellOut } from '../../core/data/types';
import { COLOR_WORD, formatAppliedAt } from '../../core/util/format';
import { UiBtn } from '../../shared/ui/button';

export interface RegisteredEvent {
  injectionId: string;
  microzoneId: string;
  canUndo: boolean;
}

const COLOR_TXT: Record<CellColor, string> = {
  RED: 'text-mz-red',
  YELLOW: 'text-mz-yellow',
  GREEN: 'text-mz-green',
};

const MACRO_NAME: Record<string, string> = {
  ABD: 'Abdomen',
  MUS: 'Muslo',
  BRA: 'Brazo',
  GLU: 'Glúteo',
};

/** P05: hoja inferior de la microzona con registro y advertencia (R04). */
@Component({
  selector: 'app-microzone-sheet',
  imports: [UiBtn, LucideTriangleAlert],
  template: `
    <div class="fade-enter fixed inset-0 z-30 bg-plum/30" (click)="close.emit()" aria-hidden="true"></div>
    <div
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'Microzona ' + cell().id"
      class="sheet-enter fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg rounded-t-[28px] bg-card px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 dark:bg-card-dark"
    >
      <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-primary-soft dark:bg-white/20" aria-hidden="true"></div>
      <p class="text-[13px] font-semibold text-muted dark:text-muted-dark">{{ header() }}</p>
      <h2 class="font-mono text-[20px] font-black">{{ cell().id }}</h2>
      <p class="mt-1 text-[15px]">
        <strong [class]="colorTxt()">{{ colorWord() }} · {{ pct() }}% recup.</strong>
        <span class="font-semibold text-muted dark:text-muted-dark">
          {{
            cell().hours_remaining <= 0
              ? 'Disponible ahora'
              : 'Disponible en ~' + hoursRounded() + ' h'
          }}
        </span>
      </p>
      <p class="text-[14px] font-semibold text-muted dark:text-muted-dark">
        {{ lastText() }} · {{ cell().uses_30d }} usos en 30 días
      </p>

      @if (!warn()) {
        <div class="mt-3">
          <p class="text-[14px] font-extrabold">Hora de aplicación</p>
          <div class="mt-1 grid grid-cols-2 gap-2">
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
              class="touch-target focus-ring rounded-2xl border border-transparent bg-primary-soft/80 px-3 text-[15px] dark:bg-white/10"
            />
          </div>
        </div>
        @if (error(); as msg) {
          <p role="alert" class="mt-2 text-[14px] font-bold text-mz-red">{{ msg }}</p>
        }
        <button
          uiBtn
          type="button"
          [extraClass]="'mt-3 w-full'"
          [disabled]="map.registerPending()"
          (click)="onRegisterClick()"
        >
          {{ map.registerPending() ? 'Registrando…' : 'Registrar inyección' }}
        </button>
      } @else {
        <p
          class="mt-3 flex items-start gap-2 rounded-2xl bg-mz-yellow-soft px-4 py-3 text-[14px] font-bold text-mz-yellow dark:bg-white/10 dark:text-[#f2d478]"
        >
          <svg lucideTriangleAlert [size]="18" class="mt-0.5 shrink-0" aria-hidden="true"></svg>
          <span>
            Esta zona aún no se recupera ({{ colorWord() }}). Puedes usarla igual, pero te sugerimos
            {{ suggestedId() ?? 'otra microzona' }}.
          </span>
        </p>
        @if (error(); as msg) {
          <p role="alert" class="mt-2 text-[14px] font-bold text-mz-red">{{ msg }}</p>
        }
        <div class="mt-3 space-y-2">
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
    </div>
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

  protected readonly pct = computed(() => Math.min(100, Math.round(this.cell().ratio * 100)));
  protected readonly hoursRounded = computed(() => Math.round(this.cell().hours_remaining));
  protected readonly colorWord = computed(() => COLOR_WORD[this.cell().color]);
  protected readonly colorTxt = computed(() => COLOR_TXT[this.cell().color]);
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
    return `touch-target focus-ring cursor-pointer rounded-2xl text-[15px] font-extrabold ${
      on
        ? 'bg-primary-soft text-primary-ink dark:bg-white/10 dark:text-primary-dark'
        : 'bg-primary-soft/50 text-muted dark:bg-white/5 dark:text-muted-dark'
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
