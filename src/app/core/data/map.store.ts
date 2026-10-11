import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, forkJoin, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { toApiError } from '../api/api-error';
import { HistoryStore } from './history.store';
import type {
  CellOut,
  InjectionOrigin,
  InjectionResult,
  MapResponse,
  SuggestionOut,
  SuggestionsResponse,
} from './types';

export type GridSize = 2 | 4 | 6;

export interface RegisterInjectionInput {
  microzone_id: string;
  confirm_not_recovered: boolean;
  origin: InjectionOrigin;
  applied_at?: string | null;
}

/** Mapa corporal + sugerencias del paciente, con mutaciones que refrescan la caché. */
@Injectable({ providedIn: 'root' })
export class MapStore {
  private readonly api = inject(ApiService);
  private readonly history = inject(HistoryStore);

  readonly map = signal<MapResponse | null>(null);
  readonly suggestions = signal<SuggestionOut[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly registerPending = signal(false);
  readonly undoPending = signal(false);
  readonly gridPending = signal(false);

  private started = false;
  private inflight = false;

  readonly topSuggestion = computed<SuggestionOut | null>(() => this.suggestions()[0] ?? null);
  readonly gridSize = computed<number>(() => this.map()?.grid_size ?? 4);

  load(force = false): void {
    if (this.inflight || (this.started && !force)) return;
    this.started = true;
    this.inflight = true;
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      map: this.api.get<MapResponse>('/map'),
      suggestions: this.api.get<SuggestionsResponse>('/suggestions', { k: 3 }),
    })
      .pipe(
        finalize(() => {
          this.inflight = false;
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: ({ map, suggestions }) => {
          this.map.set(map);
          this.suggestions.set(suggestions.suggestions);
        },
        error: (err: unknown) => this.error.set(toApiError(err).message),
      });
  }

  refresh(): void {
    this.load(true);
  }

  register(input: RegisterInjectionInput): Observable<InjectionResult> {
    this.registerPending.set(true);
    return this.api.post<InjectionResult>('/injections', input).pipe(
      tap(() => {
        this.refresh();
        this.history.refreshIfLoaded();
      }),
      finalize(() => this.registerPending.set(false)),
    );
  }

  undo(): Observable<InjectionResult> {
    this.undoPending.set(true);
    return this.api.post<InjectionResult>('/injections/undo').pipe(
      tap(() => {
        this.refresh();
        this.history.refreshIfLoaded();
      }),
      finalize(() => this.undoPending.set(false)),
    );
  }

  setGridSize(size: GridSize): Observable<MapResponse> {
    this.gridPending.set(true);
    return this.api.put<MapResponse>('/settings/grid', { grid_size: size }).pipe(
      tap((map) => {
        this.map.set(map);
        this.refresh();
        this.history.refreshIfLoaded();
      }),
      finalize(() => this.gridPending.set(false)),
    );
  }

  /** Celda por id sobre el mapa cargado (para la hoja de microzona). */
  cellById(id: string): CellOut | null {
    const map = this.map();
    if (!map) return null;
    for (const zone of map.zones) {
      for (const side of zone.sides) {
        const cell = side.cells.find((c) => c.id === id);
        if (cell) return cell;
      }
    }
    return null;
  }
}
