import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ChevronRight, Eye, Link2, LogOut, UserRound, Users } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import {
  useLinks,
  usePatientHistory,
  usePatientMap,
  useRedeemCode,
} from '../lib/doctor'
import { AppShell } from '../components/AppShell'
import Body3D from '../components/Body3D'
import type { MacroCode } from '../lib/body'
import { ZoomGrid } from '../components/MicrozoneSheet'
import type { CellOut } from '../lib/injections'
import { HistoryView } from './Home'
import { ExportButton } from './Home'
import { Avatar, Button, Card, FieldError, StatusPill } from '../components/ui'

function PatientDetail({ patientId, patientName, onBack }: {
  patientId: string
  patientName: string
  onBack: () => void
}) {
  const [view, setView] = useState<'mapa' | 'historial'>('mapa')
  const [zoom, setZoom] = useState<{ macro: MacroCode; side: 'I' | 'D'; highlight: string | null } | null>(null)
  const [cell, setCell] = useState<CellOut | null>(null)
  const mapQuery = usePatientMap(patientId)
  const historyQuery = usePatientHistory(patientId)

  return (
    <div>
      <div className="flex items-center gap-2 px-4 pt-3 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver a pacientes"
          className="pressable focus-ring touch-target w-11 rounded-2xl bg-primary-soft text-primary-ink dark:bg-white/10 dark:text-primary-dark"
        >
          <ArrowLeft aria-hidden="true" size={20} className="mx-auto" />
        </button>
        <h2 className="text-[20px]">{patientName}</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-sky px-2.5 py-1 text-[12px] font-extrabold text-sky-ink dark:bg-white/10 dark:text-[#a8c8f0]">
          <Eye aria-hidden="true" size={13} />
          Solo lectura
        </span>
      </div>

      <div className="mx-auto mt-2 grid w-56 grid-cols-2 gap-1 rounded-2xl bg-primary-soft p-1 dark:bg-white/10" role="group" aria-label="Vista del paciente">
        {(['mapa', 'historial'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`touch-target focus-ring rounded-xl text-[14px] font-extrabold capitalize ${view === v ? 'bg-card shadow dark:bg-card-dark' : 'text-muted dark:text-muted-dark'}`}
          >
            {v === 'mapa' ? 'Mapa' : 'Historial'}
          </button>
        ))}
      </div>

      {view === 'mapa' && (
        <div className="space-y-3 px-4 pt-3 lg:px-8">
          {mapQuery.isPending && <div className="h-96 animate-pulse rounded-[24px] bg-primary-soft/70 dark:bg-white/10" aria-label="Cargando mapa" />}
          {mapQuery.isError && (
            <Card>
              <Button variant="soft" onClick={() => mapQuery.refetch()} className="w-full">
                No se pudo cargar. Toca para reintentar.
              </Button>
            </Card>
          )}
          {mapQuery.data && !zoom && (
            <Card className="overflow-hidden p-2">
              <Body3D map={mapQuery.data} suggestionMacro={null} onSelectMacro={(macro) => setZoom({ macro, side: 'I', highlight: null })} />
            </Card>
          )}
          {mapQuery.data && zoom && (
            <Card className="py-2">
              <ZoomGrid
                key={`${zoom.macro}-${zoom.side}`}
                macro={zoom.macro}
                map={mapQuery.data}
                gridSize={mapQuery.data.grid_size}
                initialSide={zoom.side}
                highlightId={null}
                onBack={() => {
                  setZoom(null)
                  setCell(null)
                }}
                onSelect={(c) => setCell(c)}
              />
            </Card>
          )}
          <AnimatePresence>
            {cell && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[16px] font-black">{cell.id}</p>
                  <div className="flex items-center gap-2">
                    <StatusPill color={cell.color} />
                    <button type="button" onClick={() => setCell(null)} aria-label="Cerrar detalle" className="pressable focus-ring rounded-xl px-3 py-2 text-[14px] font-extrabold text-primary dark:text-primary-dark">
                      Cerrar
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-[14px] font-semibold text-muted dark:text-muted-dark">
                  {cell.uses_30d} usos en 30 días
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {view === 'historial' && (
        <>
          <ExportButton basePath={`/doctor/patients/${patientId}/history`} filename={`insumap-${patientName}`} />
          <HistoryView query={historyQuery} />
        </>
      )}
    </div>
  )
}

function PatientsList({ onOpen }: { onOpen: (id: string, name: string) => void }) {
  const links = useLinks()
  const redeem = useRedeemCode()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-3 px-4 pt-3 lg:px-8">
      <Card label="Agregar paciente">
        <h2 className="flex items-center gap-2 text-[17px]">
          <Link2 aria-hidden="true" size={18} className="text-primary dark:text-primary-dark" />
          Agregar paciente
        </h2>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código del paciente"
            aria-label="Código del paciente"
            autoCapitalize="characters"
            className="touch-target focus-ring min-w-0 flex-1 rounded-2xl border border-transparent bg-primary-soft/80 px-4 font-mono text-[16px] uppercase outline-none focus:border-primary dark:bg-white/10"
          />
          <Button
            disabled={redeem.isPending || !code.trim()}
            onClick={() => {
              setError(null)
              redeem.mutate(code, {
                onSuccess: () => setCode(''),
                onError: (err) => setError(err instanceof ApiError ? err.message : 'Código no válido.'),
              })
            }}
            className="shrink-0"
          >
            Vincular
          </Button>
        </div>
        <FieldError message={error ?? undefined} />
      </Card>

      {links.isPending && <div className="h-20 animate-pulse rounded-[24px] bg-primary-soft/70 dark:bg-white/10" aria-label="Cargando pacientes" />}
      {links.data && links.data.length === 0 && (
        <Card>
          <p className="text-center text-[14px] font-semibold text-muted dark:text-muted-dark">
            Sin pacientes vinculados. Pide a tu paciente su código de 8 caracteres.
          </p>
        </Card>
      )}
      <ul className="space-y-2">
        {(links.data ?? []).map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => onOpen(l.patient_id, l.patient_name)}
              className="pressable focus-ring touch-target card flex w-full items-center gap-3 px-4 py-3"
            >
              <Avatar name={l.patient_name} size={44} />
              <span className="min-w-0 flex-1 truncate text-left text-[16px] font-extrabold">{l.patient_name}</span>
              <ChevronRight aria-hidden="true" size={20} className="text-muted dark:text-muted-dark" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const DOCTOR_TABS = [
  { id: 'pacientes', label: 'Pacientes', Icon: Users },
  { id: 'perfil', label: 'Perfil', Icon: UserRound },
] as const

type DoctorTab = (typeof DOCTOR_TABS)[number]['id']

export default function DoctorHome() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<DoctorTab>('pacientes')
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null)

  return (
    <AppShell
      greeting="Hola,"
      title={open ? open.name : user?.name ?? 'Insumap'}
      userName={user?.name}
      tabs={[...DOCTOR_TABS]}
      active={open ? 'pacientes' : tab}
      onChange={(id) => {
        setOpen(null)
        setTab(id as DoctorTab)
      }}
    >
      {open ? (
        <PatientDetail patientId={open.id} patientName={open.name} onBack={() => setOpen(null)} />
      ) : tab === 'pacientes' ? (
        <PatientsList onOpen={(id, name) => setOpen({ id, name })} />
      ) : (
        <div className="space-y-3 px-4 pt-3 lg:px-8">
          <Card className="flex items-center gap-4">
            <Avatar name={user?.name ?? '?'} size={56} />
            <div className="min-w-0">
              <p className="truncate text-[19px] font-black">{user?.name}</p>
              <p className="truncate text-[14px] font-semibold text-muted dark:text-muted-dark">{user?.email} · Médico</p>
            </div>
          </Card>
          <Button variant="danger-soft" onClick={() => void logout()} className="w-full">
            <span className="inline-flex items-center gap-2">
              <LogOut aria-hidden="true" size={18} />
              Cerrar sesión
            </span>
          </Button>
        </div>
      )}
    </AppShell>
  )
}
