import { Injectable, inject, signal } from '@angular/core';
import { finalize, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { toApiError } from '../api/api-error';
import type { AssistantMessageOut, AssistantReply } from './types';

/** Conversación con el asistente IA (modo degradado si el servicio no está configurado). */
@Injectable({ providedIn: 'root' })
export class AssistantStore {
  private readonly api = inject(ApiService);

  readonly messages = signal<AssistantMessageOut[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly degraded = signal(false);

  private started = false;

  load(force = false): void {
    if (this.started && !force) return;
    this.started = true;
    this.loading.set(true);
    this.error.set(null);
    this.api
      .get<AssistantMessageOut[]>('/assistant/messages', { limit: 30 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (messages) => {
          this.messages.set(messages);
          const last = [...messages].reverse().find((m) => m.role === 'ASSISTANT');
          if (last) {
            // `provider: null` (no ausente) identifica una respuesta del template degradado.
            // Un backend anterior no envía el campo, así que no se marca la sesión como degradada.
            this.degraded.set(last.provider === null && last.blocked_by_guardrail !== true);
          }
        },
        error: (err: unknown) => this.error.set(toApiError(err).message),
      });
  }

  refresh(): void {
    this.load(true);
  }

  send(message: string): void {
    const clean = message.trim().slice(0, 500);
    if (!clean || this.sending()) return;
    this.sending.set(true);
    this.error.set(null);
    this.api
      .post<AssistantReply>('/assistant/messages', { message: clean })
      .pipe(
        tap((reply) => this.degraded.set(reply.degraded)),
        finalize(() => this.sending.set(false)),
      )
      .subscribe({
        next: () => this.refresh(),
        error: (err: unknown) => this.error.set(toApiError(err).message),
      });
  }
}
