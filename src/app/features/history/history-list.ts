import { Component, OnInit, inject, input } from '@angular/core';
import { HistoryStore } from '../../core/data/history.store';
import type { InjectionOut } from '../../core/data/types';
import { formatAppliedAt, statusBadge } from '../../core/util/format';
import { UiBtn } from '../../shared/ui/button';

/** Lista paginada del historial (filas con hairlines, estilo hims). */
@Component({
  selector: 'app-history-list',
  imports: [UiBtn],
  template: `
    @if (store.loading() && store.items().length === 0) {
      <div class="space-y-2" aria-label="Cargando historial">
        @for (i of [0, 1, 2, 3]; track i) {
          <div class="h-16 animate-pulse rounded-3xl bg-sand"></div>
        }
      </div>
    } @else if (store.error(); as msg) {
      <div class="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-10 text-center">
        <p class="text-[17px] font-medium text-ink-strong">No pudimos cargar el historial</p>
        <p class="mt-2 text-[14px] text-muted">{{ msg }}</p>
        <button uiBtn type="button" [extraClass]="'mt-5 w-full py-3.5'" (click)="retry()">
          Reintentar
        </button>
      </div>
    } @else if (store.items().length === 0) {
      <div class="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-10 text-center">
        <p class="text-[17px] font-medium text-ink-strong">Aún no hay aplicaciones registradas</p>
        <p class="mt-2 text-[14px] text-muted">{{ emptyHint() }}</p>
      </div>
    } @else {
      <ul class="card divide-y divide-line overflow-hidden">
        @for (item of store.items(); track item.id) {
          <li class="flex items-center gap-3.5 px-5 py-4">
            <div
              class="flex h-10 w-14 shrink-0 items-center justify-center rounded-full bg-sand text-[12px] font-medium text-ink"
            >
              {{ hourText(item) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-mono text-[14px] font-medium text-ink">{{ item.microzone_id }}</p>
              <p class="text-[13px] text-muted">{{ dateText(item) }} · {{ item.macro }}</p>
            </div>
            <span [class]="badgeCls(item)">{{ badgeText(item) }}</span>
          </li>
        }
      </ul>
      @if (store.nextCursor()) {
        <button
          uiBtn
          variant="outline"
          type="button"
          [extraClass]="'mt-3 w-full py-3'"
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
    return `shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${statusBadge(item.status).className}`;
  }
}
