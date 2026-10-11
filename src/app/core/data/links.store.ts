import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { toApiError } from '../api/api-error';
import type { LinkCodeOut, LinkOut } from './types';

/** Vínculos médico-paciente: códigos de un solo uso, canje y revocación. */
@Injectable({ providedIn: 'root' })
export class LinksStore {
  private readonly api = inject(ApiService);

  readonly links = signal<LinkOut[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly creating = signal(false);
  readonly redeeming = signal(false);
  readonly revoking = signal(false);

  private started = false;

  load(force = false): void {
    if (this.started && !force) return;
    this.started = true;
    this.loading.set(true);
    this.error.set(null);
    this.api.get<LinkOut[]>('/links').pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (links) => this.links.set(links),
      error: (err: unknown) => this.error.set(toApiError(err).message),
    });
  }

  refresh(): void {
    this.load(true);
  }

  createCode(): Observable<LinkCodeOut> {
    this.creating.set(true);
    return this.api.post<LinkCodeOut>('/links/codes', {}).pipe(
      tap(() => this.refresh()),
      finalize(() => this.creating.set(false)),
    );
  }

  revoke(linkId: string): Observable<void> {
    this.revoking.set(true);
    return this.api.delete<void>(`/links/${linkId}`).pipe(
      tap(() => this.refresh()),
      finalize(() => this.revoking.set(false)),
    );
  }

  redeem(code: string): Observable<LinkOut> {
    this.redeeming.set(true);
    return this.api
      .post<LinkOut>('/links', { code: code.trim().toUpperCase().replace(/-/g, '') })
      .pipe(
        tap(() => this.refresh()),
        finalize(() => this.redeeming.set(false)),
      );
  }
}
