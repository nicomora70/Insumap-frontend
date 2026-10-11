import { Component, OnInit, inject, input } from '@angular/core';
import { HistoryStore } from '../../core/data/history.store';
import type { InjectionOut } from '../../core/data/types';
import { formatAppliedAt, statusBadge } from '../../core/util/format';
import { UiBtn } from '../../shared/ui/button';

/** Lista paginada del historial. patientId = null → historial propio. */
@Component({
  selector: 'app-history-list',
  imports: [UiBtn],
  template: `
    @if (store.loading() && store.items().length === 0) {
      <div class="space-y-2" aria-label="Cargando historial">
        @for (i of [0, 1, 2, 3]; track i) {
          <div class="h-16 animate-pulse rounded-[24px] bg-primary-soft/70 dark:bg-white/10"></div>
        }
      </div>
    } @else if (store.error(); as msg) {
      <div class="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-10 text-center">
        <p class="text-[16px] font-extrabold">No pudimos cargar el historial</p>
        <p class="mt-1 text-[14px] text-muted dark:text-muted-dark">{{ msg }}</p>
        <button uiBtn type="button" [extraClass]="'mt-4 w-full'" (click)="retry()">Reintentar</button>
      </div>
    } @else if (store.items().length === 0) {
      <div class="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-10 text-center">
        <p class="text-[16px] font-extrabold">Aún no hay aplicaciones registradas</p>
        <p class="mt-1 text-[14px] text-muted dark:text-muted-dark">
          {{ emptyHint() }}
        </p>
      </div>
    } @else {
      <ul class="space-y-2">
        @for (item of store.items(); track item.id) {
          <li class="card flex items-center gap-3 px-4 py-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-[12px] font-extrabold text-primary-ink dark:bg-white/10 dark:text-primary-dark"
            >
              {{ hourText(item) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-mono text-[15px] font-bold">{{ item.microzone_id }}</p>
              <p class="text-[13px] font-semibold text-muted dark:text-muted-dark">
                {{ dateText(item) }} · {{ item.macro }}
              </p>
            </div>
            <span [class]="badgeCls(item)">{{ badgeText(item) }}</span>
          </li>
        }
      </ul>
      @if (store.nextCursor()) {
        <button
          uiBtn
          variant="soft"
          type="button"
          [extraClass]="'mt-3 w-full'"
          [disabled]="store.loadingMore()"
          (click)="store.loadMore()"
        >
          {{ store.loadingMore() ? 'Cargando…' : 'Ver más' }}
        </button>
      }
    }
  `,
})
export class HistoryList implements OnInit {
  protected readonly store = inject(HistoryStore);

  readonly patientId = input<string | null>(null);
  readonly emptyHint = input('Registra tu primera dosis desde el mapa y aparecerá aquí.');

  ngOnInit(): void {
    this.store.open(this.patientId(), true);
  }

  protected retry(): void {
    this.store.open(this.patientId(), true);
  }

  protected hourText(item: InjectionOut): string {
    return formatAppliedAt(item.applied_at).time.replace(/\s?[ap]\.?\s?m\.?$/i, '');
  }

  protected dateText(item: InjectionOut): string {
    return formatAppliedAt(item.applied_at).date;
  }

  protected badgeText(item: InjectionOut): string {
    return statusBadge(item.status).text;
  }

  protected badgeCls(item: InjectionOut): string {
    return `shrink-0 rounded-full px-2.5 py-1 text-[12px] font-extrabold ${statusBadge(item.status).className}`;
  }
}
