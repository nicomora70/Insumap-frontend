import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, forkJoin, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { toApiError } from '../api/api-error';
import type { ConfirmResponse, DoseIn, ReminderOut, ScheduleResponse } from './types';

/** Cronograma de dosis + próximos recordatorios (se refresca cada minuto). */
@Injectable({ providedIn: 'root' })
export class RemindersStore {
  private readonly api = inject(ApiService);

  readonly schedule = signal<ScheduleResponse | null>(null);
  readonly upcoming = signal<ReminderOut[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly snoozingId = signal<string | null>(null);
  readonly confirmingId = signal<string | null>(null);

  private started = false;
  private timer: number | null = null;

  load(force = false): void {
    if (this.started && !force) return;
    this.started = true;
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      schedule: this.api.get<ScheduleResponse>('/schedule'),
      upcoming: this.api.get<ReminderOut[]>('/reminders/upcoming'),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ schedule, upcoming }) => {
          this.schedule.set(schedule);
          this.upcoming.set(upcoming);
        },
        error: (err: unknown) => this.error.set(toApiError(err).message),
      });
    this.startPolling();
  }

  refresh(): void {
    this.load(true);
  }

  private startPolling(): void {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      if (!this.started) return;
      this.api.get<ReminderOut[]>('/reminders/upcoming').subscribe({
        next: (upcoming) => this.upcoming.set(upcoming),
        error: () => undefined,
      });
    }, 60_000);
  }

  save(doses: DoseIn[]): Observable<ScheduleResponse> {
    this.saving.set(true);
    return this.api.put<ScheduleResponse>('/schedule', { doses }).pipe(
      tap((schedule) => {
        this.schedule.set(schedule);
        this.refresh();
      }),
      finalize(() => this.saving.set(false)),
    );
  }

  snooze(id: string, minutes: number): Observable<ReminderOut> {
    this.snoozingId.set(id);
    return this.api.post<ReminderOut>(`/reminders/${id}/snooze`, { minutes }).pipe(
      tap(() => this.refresh()),
      finalize(() => this.snoozingId.set(null)),
    );
  }

  confirm(id: string): Observable<ConfirmResponse> {
    this.confirmingId.set(id);
    return this.api.post<ConfirmResponse>(`/reminders/${id}/confirm`).pipe(
      tap(() => this.refresh()),
      finalize(() => this.confirmingId.set(null)),
    );
  }
}
