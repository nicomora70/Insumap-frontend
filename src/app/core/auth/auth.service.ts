import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { components } from '../api/api-types';
import { ApiService } from '../api/api.service';

export type UserOut = components['schemas']['UserOut'];
export type TokenResponse = components['schemas']['TokenResponse'];
export type RegisterRequest = components['schemas']['RegisterRequest'];

const ACCESS_KEY = 'insumap_at';

/** Sesión del usuario: token de acceso en localStorage + refresh con cookie httpOnly. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  readonly user = signal<UserOut | null>(null);
  readonly ready = signal(false);
  readonly role = computed(() => this.user()?.role ?? null);

  private refreshInFlight: Observable<boolean> | null = null;

  token(): string | null {
    try {
      return localStorage.getItem(ACCESS_KEY);
    } catch {
      return null;
    }
  }

  private setToken(token: string | null): void {
    try {
      if (token) localStorage.setItem(ACCESS_KEY, token);
      else localStorage.removeItem(ACCESS_KEY);
    } catch {
      /* modo privado: solo en memoria */
    }
  }

  /** Arranque: si hay token vigente entra directo; si expiró, intenta refresh una vez. */
  async boot(): Promise<void> {
    if (!this.token()) {
      this.ready.set(true);
      return;
    }
    try {
      this.user.set(await firstValueFrom(this.api.get<UserOut>('/auth/me')));
    } catch {
      const ok = await firstValueFrom(this.refresh());
      if (ok) {
        try {
          this.user.set(await firstValueFrom(this.api.get<UserOut>('/auth/me')));
        } catch {
          this.clearSession();
        }
      } else {
        this.clearSession();
      }
    } finally {
      this.ready.set(true);
    }
  }

  login(email: string, password: string): Observable<UserOut> {
    return this.api.post<TokenResponse>('/auth/login', { email, password }).pipe(
      tap((t) => {
        this.setToken(t.access_token);
        this.user.set(t.user);
      }),
      map((t) => t.user),
    );
  }

  register(data: RegisterRequest): Observable<UserOut> {
    return this.api.post<TokenResponse>('/auth/register', data).pipe(
      tap((t) => {
        this.setToken(t.access_token);
        this.user.set(t.user);
      }),
      map((t) => t.user),
    );
  }

  logout(): Observable<void> {
    return this.api.post<void>('/auth/logout').pipe(
      catchError(() => of(undefined)),
      tap(() => this.clearSession()),
      map(() => undefined),
    );
  }

  /** Refresh con cookie httpOnly; una sola petición concurrente (single-flight). */
  refresh(): Observable<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.http
        .post<TokenResponse>(
          `${this.api.base}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        .pipe(
          tap((t) => {
            this.setToken(t.access_token);
            if (t.user) this.user.set(t.user);
          }),
          map(() => true),
          catchError(() => {
            this.clearSession();
            return of(false);
          }),
          finalize(() => {
            this.refreshInFlight = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.refreshInFlight;
  }

  clearSession(): void {
    this.setToken(null);
    this.user.set(null);
  }

  /** HU-22: recuperación de contraseña (el backend responde igual exista o no el email). */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/forgot-password', { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  }
}
