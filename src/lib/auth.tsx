import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiFetch, getAccessToken, setAccessToken } from './api'
import type { RegisterRequest, TokenResponse, UserOut } from './api'

type AuthState = {
  user: UserOut | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!getAccessToken()) {
        setLoading(false)
        return
      }
      try {
        const me = await apiFetch<UserOut>('/auth/me')
        if (!cancelled) setUser(me)
      } catch {
        setAccessToken(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void boot()
    const onLogout = () => setUser(null)
    window.addEventListener('insumap:logout', onLogout)
    return () => {
      cancelled = true
      window.removeEventListener('insumap:logout', onLogout)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiFetch<TokenResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setAccessToken(tokens.access_token)
    setUser(tokens.user)
  }, [])

  const register = useCallback(async (data: RegisterRequest) => {
    const tokens = await apiFetch<TokenResponse>('/auth/register', {
      method: 'POST',
      body: data,
    })
    setAccessToken(tokens.access_token)
    setUser(tokens.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {
      /* best effort: the local session always closes */
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
