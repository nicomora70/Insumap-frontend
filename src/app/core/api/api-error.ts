import { HttpErrorResponse } from '@angular/common/http';

/** Error de la API con el formato {"error": {code, message, detail}} del backend. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly detail: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Convierte cualquier fallo (HttpErrorResponse, Error, desconocido) en ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return new ApiError(
        'NETWORK',
        'No pudimos conectar con el servidor. Revisa tu conexión.',
        0,
        null,
      );
    }
    const body = err.error as {
      error?: { code?: string; message?: string; detail?: unknown };
    } | null;
    const e = body?.error;
    return new ApiError(
      e?.code ?? 'UNKNOWN',
      e?.message ?? 'Ocurrió un error. Inténtalo de nuevo.',
      err.status,
      e?.detail ?? null,
    );
  }

  return new ApiError('UNKNOWN', 'Ocurrió un error. Inténtalo de nuevo.', 0, null);
}
