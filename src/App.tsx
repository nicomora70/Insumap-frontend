import { Navigate, Route, Routes, useNavigate } from 'react-router'
import { useAuth } from './lib/auth'
import Home from './pages/Home'
import type { Tab } from './pages/Home'
import DoctorHome from './pages/Doctor'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import type { JSX } from 'react'

const TAB_PATH: Record<Tab, string> = {
  mapa: '/mapa',
  historial: '/historial',
  dosis: '/dosis',
  ayuda: '/ayuda',
  perfil: '/perfil',
}

function Loading() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg items-center justify-center bg-app-bg dark:bg-app-bg-dark">
      <p className="text-[15px] text-muted dark:text-muted-dark">Cargando…</p>
    </div>
  )
}

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PatientOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'DOCTOR') return <Navigate to="/pacientes" replace />
  return children
}

function DoctorOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'DOCTOR') return <Navigate to="/mapa" replace />
  return children
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (user) return <Navigate to="/" replace />
  return children
}

/** Entrada raíz: dirige según el rol (sesión vigente entra directo). */
function RoleIndex() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'DOCTOR' ? '/pacientes' : '/mapa'} replace />
}

function PatientPage({ tab }: { tab: Tab }) {
  const navigate = useNavigate()
  return <Home tab={tab} onTabChange={(t) => navigate(TAB_PATH[t])} />
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
        path="/forgot-password"
        element={
          <PublicOnly>
            <ForgotPassword />
          </PublicOnly>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicOnly>
            <ResetPassword />
          </PublicOnly>
        }
      />

      <Route
        path="/mapa"
        element={
          <PatientOnly>
            <PatientPage tab="mapa" />
          </PatientOnly>
        }
      />
      <Route
        path="/historial"
        element={
          <PatientOnly>
            <PatientPage tab="historial" />
          </PatientOnly>
        }
      />
      <Route
        path="/dosis"
        element={
          <PatientOnly>
            <PatientPage tab="dosis" />
          </PatientOnly>
        }
      />
      <Route
        path="/ayuda"
        element={
          <PatientOnly>
            <PatientPage tab="ayuda" />
          </PatientOnly>
        }
      />
      <Route
        path="/perfil"
        element={
          <PatientOnly>
            <PatientPage tab="perfil" />
          </PatientOnly>
        }
      />

      <Route
        path="/pacientes"
        element={
          <DoctorOnly>
            <DoctorHome />
          </DoctorOnly>
        }
      />

      <Route
        path="/"
        element={
          <Protected>
            <RoleIndex />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
