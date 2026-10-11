import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { toApiError } from '../api/api-error';
import type { HistoryPage, InjectionOut } from './types';

const PAGE_SIZE = 20;

/** Historial paginado por cursor. Contexto: null = propio; id = paciente del médico. */
@Injectable({ providedIn: 'root' })
export class HistoryStore {
  private readonly api = inject(ApiService);

  readonly items = signal<InjectionOut[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly nextCursor = signal<string | null>(null);

  private started = false;
  private context: string | null = null;

  /** Abre el historial de un contexto (paciente propio o de un médico). */
  open(patientId: string | null, force = false): void {
    if (this.started && this.context === patientId && !force) return;
    this.context = patientId;
    this.started = true;
    this.items.set([]);
    this.nextCursor.set(null);
    this.error.set(null);
    this.loadPage(null, true);
  }

  refreshIfLoaded(): void {
    if (this.started) this.loadPage(null, true);
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore() || this.loading()) return;
    this.loadPage(cursor, false);
  }

  private path(patientId: string | null): string {
    return patientId ? `/doctor/patients/${patientId}/history` : '/history';
  }

  private loadPage(cursor: string | null, replace: boolean): void {
    if (replace) this.loading.set(true);
    else this.loadingMore.set(true);
    this.error.set(null);

    this.api
      .get<HistoryPage>(this.path(this.context), {
        limit: PAGE_SIZE,
        order: 'desc',
        cursor: cursor ?? undefined,
      })
      .subscribe({
        next: (page) => {
          this.items.update((items) => (replace ? page.items : [...items, ...page.items]));
          this.nextCursor.set(page.next_cursor);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: (err: unknown) => {
          this.error.set(toApiError(err).message);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });
  }
}
