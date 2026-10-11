import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toApiError } from '../api/api-error';
import { AuthService } from './auth.service';

const AUTH_FREE = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

/**
 * Adjunta el Bearer a las llamadas de la API y, ante un 401 TOKEN_EXPIRED,
 * refresca la sesión una vez y reintenta la petición original.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const auth = inject(AuthService);
  const isRefresh = req.url.includes('/auth/refresh');
  const isAuthFree = AUTH_FREE.some((p) => req.url.includes(p));
  const token = auth.token();

  let outReq = req.clone({ withCredentials: true });
  if (token && !isRefresh && !isAuthFree) {
    outReq = outReq.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(outReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !isRefresh) {
        const code = (err.error as { error?: { code?: string } } | null)?.error?.code;
        if (code === 'TOKEN_EXPIRED') {
          return auth.refresh().pipe(
            switchMap((ok) => {
              if (!ok) return throwError(() => toApiError(err));
              const retry = req.clone({
                withCredentials: true,
                setHeaders: { Authorization: `Bearer ${auth.token()}` },
              });
              return next(retry);
            }),
          );
        }
      }
      return throwError(() => err);
    }),
  );
};
