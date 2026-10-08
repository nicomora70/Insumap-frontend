import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import {
  useLinks,
  usePatientHistory,
  usePatientMap,
  useRedeemCode,
} from '../lib/doctor'
import BodyMap from '../components/BodyMap'
import type { MacroCode } from '../components/BodyMap'
import { ZoomGrid } from '../components/MicrozoneSheet'
import type { CellOut } from '../lib/injections'
import { HistoryView } from './Home'
import { ExportButton } from './Home'

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
      <div className="flex items-center gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver a pacientes"
          className="pressable touch-target w-11 rounded-2xl bg-black/5 text-[20px] dark:bg-white/10"
        >
          ‹
        </button>
        <h2 className="text-[20px]">{patientName}</h2>
        <span className="rounded-full bg-black/5 px-2.5 py-1 text-[12px] font-semibold text-black/50 dark:bg-white/10 dark:text-white/50">
          Solo lectura
        </span>
      </div>

      <div className="mx-auto mt-2 grid w-56 grid-cols-2 gap-1 rounded-2xl bg-black/5 p-1 dark:bg-white/10" role="group" aria-label="Vista del paciente">
        {(['mapa', 'historial'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`touch-target rounded-xl text-[14px] font-semibold capitalize ${view === v ? 'bg-white shadow dark:bg-[#1c1c1e]' : 'text-black/50 dark:text-white/50'}`}
          >
            {v === 'mapa' ? 'Mapa' : 'Historial'}
          </button>
        ))}
      </div>

      {view === 'mapa' && (
        <div className="space-y-3 px-4 pb-32 pt-3">
          {mapQuery.isPending && <div className="h-96 animate-pulse rounded-3xl bg-black/5 dark:bg-white/10" aria-label="Cargando mapa" />}
          {mapQuery.isError && (
            <button
              type="button"
              onClick={() => mapQuery.refetch()}
              className="pressable touch-target w-full rounded-3xl bg-white p-4 font-semibold dark:bg-[#1c1c1e]"
            >
              No se pudo cargar. Toca para reintentar.
            </button>
          )}
          {mapQuery.data && !zoom && (
            <div className="rounded-3xl bg-white py-3 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
              <BodyMap map={mapQuery.data} suggestionId={null} onSelectMacro={(macro) => setZoom({ macro, side: 'I', highlight: null })} />
            </div>
          )}
          {mapQuery.data && zoom && (
            <div className="rounded-3xl bg-white py-2 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
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
            </div>
          )}
          <AnimatePresence>
            {cell && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="rounded-3xl bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[16px] font-bold">{cell.id}</p>
                  <button type="button" onClick={() => setCell(null)} aria-label="Cerrar detalle" className="pressable rounded-xl px-3 py-2 text-[14px] font-semibold text-[#0a84ff]">
                    Cerrar
                  </button>
                </div>
                <p className="mt-1 text-[14px] text-black/60 dark:text-white/60">
                  {cell.color === 'GREEN' ? 'Verde, disponible' : cell.color === 'YELLOW' ? 'Amarilla, casi lista' : 'Roja, en recuperación'} · {cell.uses_30d} usos en 30 días
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
    <div className="space-y-3 px-4 pb-32 pt-3">
      <section className="rounded-3xl bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
        <h2 className="text-[17px]">Agregar paciente</h2>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código del paciente"
            aria-label="Código del paciente"
            autoCapitalize="characters"
            className="touch-target min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#f2f2f7] px-4 font-mono text-[16px] uppercase dark:border-white/10 dark:bg-black"
          />
          <button
            type="button"
            disabled={redeem.isPending || !code.trim()}
            onClick={() => {
              setError(null)
              redeem.mutate(code, {
                onSuccess: () => setCode(''),
                onError: (err) => setError(err instanceof ApiError ? err.message : 'Código no válido.'),
              })
            }}
            className="pressable touch-target shrink-0 rounded-2xl bg-[#0a84ff] px-4 font-semibold text-white disabled:opacity-60"
          >
            Vincular
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-[13px] text-[#ff3b30]">
            {error}
          </p>
        )}
      </section>

      {links.isPending && <div className="h-20 animate-pulse rounded-3xl bg-black/5 dark:bg-white/10" aria-label="Cargando pacientes" />}
      {links.data && links.data.length === 0 && (
        <p className="rounded-3xl bg-white p-4 text-center text-[14px] text-black/50 dark:bg-[#1c1c1e] dark:text-white/50">
          Sin pacientes vinculados. Pide a tu paciente su código de 8 caracteres.
        </p>
      )}
      <ul className="space-y-2">
        {(links.data ?? []).map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => onOpen(l.patient_id, l.patient_name)}
              className="pressable touch-target flex w-full items-center justify-between rounded-3xl bg-white px-4 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10"
            >
              <span className="text-[16px] font-semibold">{l.patient_name}</span>
              <span aria-hidden="true" className="text-black/30 dark:text-white/30">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DoctorHome() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<'pacientes' | 'perfil'>('pacientes')
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null)

  return (
    <div className="mx-auto min-h-svh w-full max-w-lg bg-[#f2f2f7] text-[#1c1c1e] dark:bg-black dark:text-[#f2f2f7]">
      <header className="chrome-translucent sticky top-0 z-10 border-b border-black/5 px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))] dark:border-white/10">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#0a84ff]">Insumap · Médico</p>
        <h1 className="text-[28px] leading-tight">{open ? 'Paciente' : tab === 'pacientes' ? 'Mis pacientes' : 'Perfil'}</h1>
      </header>

      {open ? (
        <PatientDetail patientId={open.id} patientName={open.name} onBack={() => setOpen(null)} />
      ) : tab === 'pacientes' ? (
        <PatientsList onOpen={(id, name) => setOpen({ id, name })} />
      ) : (
        <div className="space-y-3 px-4 pb-32 pt-3">
          <section className="rounded-3xl bg-white p-4 text-center shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
            <p className="text-[20px] font-bold">{user?.name}</p>
            <p className="mt-0.5 text-[14px] text-black/50 dark:text-white/50">{user?.email} · Médico</p>
          </section>
          <button
            type="button"
            onClick={() => void logout()}
            className="pressable touch-target w-full rounded-2xl bg-[#ff3b30]/10 font-semibold text-[#ff3b30]"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {!open && (
        <nav aria-label="Navegación del médico" className="chrome-translucent fixed inset-x-0 bottom-0 z-10 border-t border-black/5 dark:border-white/10">
          <div className="mx-auto grid w-full max-w-lg grid-cols-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
            {(['pacientes', 'perfil'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-current={tab === t ? 'page' : undefined}
                onClick={() => setTab(t)}
                className={`touch-target pressable rounded-2xl text-[12px] font-semibold capitalize ${tab === t ? 'text-[#0a84ff]' : 'text-black/40 dark:text-white/40'}`}
              >
                {t === 'pacientes' ? 'Pacientes' : 'Perfil'}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
