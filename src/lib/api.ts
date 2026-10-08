import type { components } from './api-types'

export type UserOut = components['schemas']['UserOut']
export type TokenResponse = components['schemas']['TokenResponse']
export type RegisterRequest = components['schemas']['RegisterRequest']
export type LoginRequest = components['schemas']['LoginRequest']
export type ErrorResponse = components['schemas']['ErrorResponse']

const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`
const ACCESS_KEY = 'insumap_at'

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(ACCESS_KEY, token)
    else localStorage.removeItem(ACCESS_KEY)
  } catch {
    /* private mode: session-only */
  }
}

export class ApiError extends Error {
  code: string
  status: number
  detail: unknown

  constructor(code: string, message: string, status: number, detail: unknown = null) {
    super(message)
    this.code = code
    this.status = status
    this.detail = detail
  }
}

function toApiError(status: number, body: unknown): ApiError {
  const err = (body as { error?: { code?: string; message?: string; detail?: unknown } } | null)?.error
  return new ApiError(
    err?.code ?? 'UNKNOWN',
    err?.message ?? 'Ocurrió un error. Inténtalo de nuevo.',
    status,
    err?.detail ?? null,
  )
}

async function raw(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' })
}

export async function apiFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { method = 'GET', body } = options
  let res = await raw(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }, getAccessToken())

  if (res.status === 401 && getAccessToken()) {
    let data: unknown = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    const code = (data as { error?: { code?: string } } | null)?.error?.code
    if (code === 'TOKEN_EXPIRED') {
      const refresh = await raw('/auth/refresh', { method: 'POST' }, null)
      if (refresh.ok) {
        const tokens = (await refresh.json()) as TokenResponse
        setAccessToken(tokens.access_token)
        res = await raw(
          path,
          { method, body: body === undefined ? undefined : JSON.stringify(body) },
          tokens.access_token,
        )
      } else {
        setAccessToken(null)
        window.dispatchEvent(new Event('insumap:logout'))
        throw toApiError(refresh.status, await refresh.json().catch(() => null))
      }
    } else {
      throw toApiError(res.status, data)
    }
  }

  if (!res.ok) {
    let data: unknown = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    throw toApiError(res.status, data)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
