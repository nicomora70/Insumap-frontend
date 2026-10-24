import { Component, OnInit, computed, inject, input } from '@angular/core';
import { LucideCheck } from '@lucide/angular';
import { HistoryStore } from '../../core/data/history.store';
import type { InjectionOut } from '../../core/data/types';
import { formatAppliedAt, statusBadge } from '../../core/util/format';
import { UiBtn } from '../../shared/ui/button';
import { UiEmpty } from '../../shared/ui/empty';

/** Lista paginada del historial, agrupada por día. */
@Component({
  selector: 'app-history-list',
  imports: [UiBtn, UiEmpty, LucideCheck],
  template: `
    @if (store.loading() && store.items().length === 0) {
      <div class="space-y-4" aria-label="Cargando historial">
        @for (i of [0, 1, 2]; track i) {
          <div class="space-y-2">
            <div class="h-4 w-24 animate-pulse rounded-full bg-sand"></div>
            <div class="h-20 animate-pulse rounded-3xl bg-sand"></div>
          </div>
        }
      </div>
    } @else if (store.error(); as msg) {
      <div class="card p-6">
        <ui-empty title="No pudimos cargar el historial" [message]="msg">
          <button uiBtn type="button" [extraClass]="'w-full'" (click)="retry()">Reintentar</button>
        </ui-empty>
      </div>
    } @else if (store.items().length === 0) {
      <div class="card p-6">
        <ui-empty title="Aún no hay aplicaciones registradas" [message]="emptyHint()" />
      </div>
    } @else {
      @for (group of groups(); track group.date) {
        <section class="mt-6 first:mt-0">
          <h2
            class="sticky top-[72px] z-10 -mx-1 mb-2 bg-app-bg/90 px-1 py-2 text-caption font-medium tracking-[0.08em] text-muted backdrop-blur-sm"
          >
            {{ group.date }}
          </h2>
          <ul class="card overflow-hidden">
            @for (item of group.items; track item.id) {
              <li class="flex items-center gap-4 px-5 py-4">
                <span class="tnum w-16 shrink-0 text-h3 leading-none text-ink-strong">
                  {{ hourText(item) }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="tnum truncate text-small font-medium text-ink">{{ item.microzone_id }}</p>
                  <p class="mt-0.5 text-caption text-muted">{{ item.macro }}</p>
                </div>
                @if (item.status === 'UNDONE') {
                  <span [class]="badgeCls(item)">{{ badgeText(item) }}</span>
                } @else {
                  <svg
                    lucideCheck
                    [size]="17"
                    [strokeWidth]="2.4"
                    class="shrink-0 text-mz-green"
                    aria-label="Registrada"
                  ></svg>
                }
              </li>
            }
          </ul>
        </section>
      }
      @if (store.nextCursor()) {
        <button
          uiBtn
          variant="outline"
          type="button"
          [extraClass]="'mt-4 w-full'"
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

  protected readonly groups = computed(() => {
    const groups = new Map<string, InjectionOut[]>();
    for (const item of this.store.items()) {
      const date = formatAppliedAt(item.applied_at).date;
      const current = groups.get(date);
      if (current) current.push(item);
      else groups.set(date, [item]);
    }
    return Array.from(groups, ([date, items]) => ({ date, items }));
  });

  ngOnInit(): void {
    this.store.open(this.patientId(), true);
  }

  protected retry(): void {
    this.store.open(this.patientId(), true);
  }

  protected hourText(item: InjectionOut): string {
    return formatAppliedAt(item.applied_at).time.replace(/\s?[ap]\.?\s?m\.?$/i, '');
  }

  protected badgeText(item: InjectionOut): string {
    return statusBadge(item.status).text;
  }

  protected badgeCls(item: InjectionOut): string {
    return `shrink-0 rounded-full bg-sand px-3 py-1.5 text-caption font-semibold text-muted`;
  }
}
