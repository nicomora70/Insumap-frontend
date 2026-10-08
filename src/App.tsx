import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './lib/auth'
import Home from './pages/Home'
import DoctorHome from './pages/Doctor'
import Login from './pages/Login'
import Register from './pages/Register'
import type { JSX } from 'react'

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-lg items-center justify-center bg-[#f2f2f7] dark:bg-black">
        <p className="text-[15px] text-black/50 dark:text-white/50">Cargando…</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RoleHome() {
  const { user } = useAuth()
  if (user?.role === 'DOCTOR') return <DoctorHome />
  return <Home />
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-lg items-center justify-center bg-[#f2f2f7] dark:bg-black">
        <p className="text-[15px] text-black/50 dark:text-white/50">Cargando…</p>
      </div>
    )
  }
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <Register />
          </PublicOnly>
        }
      />
      <Route
        path="/*"
        element={
          <Protected>
            <RoleHome />
          </Protected>
        }
      />
    </Routes>
  )
}
