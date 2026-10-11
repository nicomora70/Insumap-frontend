import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toApiError } from './api-error';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Cliente HTTP tipado del backend Insumap.
 * Agrega el prefijo /api/v1, envía la cookie de refresh (withCredentials)
 * y convierte los errores al formato ApiError del proyecto.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  readonly root = environment.apiUrl;
  readonly base = `${environment.apiUrl}/api/v1`;

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http
      .get<T>(this.base + path, { params: this.toParams(params), withCredentials: true })
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .post<T>(this.base + path, body ?? {}, { withCredentials: true })
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .put<T>(this.base + path, body ?? {}, { withCredentials: true })
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<T>(this.base + path, { withCredentials: true })
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  /** Descarga binaria autenticada (exportes PDF/XLSX/CSV). */
  download(path: string): Observable<Blob> {
    return this.http
      .get(this.base + path, { responseType: 'blob', withCredentials: true })
      .pipe(catchError((e) => throwError(() => toApiError(e))));
  }

  private toParams(params?: QueryParams): HttpParams | undefined {
    if (!params) return undefined;
    let out = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) continue;
      out = out.set(key, String(value));
    }
    return out;
  }
}
