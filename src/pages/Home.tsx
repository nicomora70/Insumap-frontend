import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '../lib/auth'
import BodyMap from '../components/BodyMap'
import type { MacroCode } from '../components/BodyMap'
import { parseMacro, parseSide } from '../components/BodyMap'
import { MicrozoneSheet, ZoomGrid } from '../components/MicrozoneSheet'
import { useHistory, statusBadge, formatAppliedAt } from '../lib/history'
import type { InjectionOut } from '../lib/history'
import { useSetGridSize } from '../lib/settings'
import type { GridSize } from '../lib/settings'
import { ApiError } from '../lib/api'
import { downloadExport, useCreateCode, useLinks, useRevokeLink } from '../lib/doctor'
import {
  describeLocation,
  useBodyMap,
  useSuggestions,
  useUndoInjection,
} from '../lib/injections'
import type { CellOut, MapResponse } from '../lib/injections'
import Reminders from './Reminders'
import Assistant from './Assistant'

type Tab = 'mapa' | 'historial' | 'recordatorios' | 'asistente' | 'perfil'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'mapa', label: 'Mapa', icon: '◉' },
  { id: 'historial', label: 'Historial', icon: '☰' },
  { id: 'recordatorios', label: 'Dosis', icon: '⏰' },
  { id: 'asistente', label: 'Ayuda', icon: '✦' },
  { id: 'perfil', label: 'Perfil', icon: '○' },
]

const CELL_STYLE: Record<CellOut['color'], string> = {
  RED: 'bg-[#ff3b30]/15 text-[#ff3b30] pattern-red',
  YELLOW: 'bg-[#ffcc00]/20 text-[#8a6d00] pattern-yellow dark:text-[#ffd60a]',
  GREEN: 'bg-[#34c759]/15 text-[#248a3d] pattern-green dark:text-[#30d158]',
}

const CELL_ICON: Record<CellOut['color'], string> = { RED: '●', YELLOW: '◐', GREEN: '○' }

const COLOR_LABEL: Record<CellOut['color'], string> = {
  RED: 'roja, en recuperación',
  YELLOW: 'amarilla, casi lista',
  GREEN: 'verde, disponible',
}

function MacroCard({
  zone,
  gridSize,
  onTap,
}: {
  zone: MapResponse['zones'][number]
  gridSize: number
  onTap: (cell: CellOut) => void
}) {
  const cols = gridSize <= 2 ? 2 : gridSize <= 4 ? 4 : 3
  return (
    <section
      aria-label={zone.label}
      className="rounded-3xl bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10"
    >
      <h2 className="text-[17px]">{zone.label}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {zone.sides.map((s) => (
          <div key={s.side}>
            <p className="mb-1 text-[12px] font-semibold text-black/40 dark:text-white/40">
              {s.side === 'I' ? 'Izquierdo' : 'Derecho'}
            </p>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="group" aria-label={`${zone.label} lado ${s.side}`}>
              {s.cells.map((cell) => (
                <button
                  key={cell.id}
                  type="button"
                  aria-label={`Microzona ${cell.id}, ${COLOR_LABEL[cell.color]}`}
                  data-microzone={cell.id}
                  onClick={() => onTap(cell)}
                  className={`touch-target pressable flex items-center justify-center rounded-xl text-[13px] font-bold ${CELL_STYLE[cell.color]}`}
                >
                  <span aria-hidden="true">{CELL_ICON[cell.color]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function MapSkeleton() {
  return (
    <div className="space-y-3 px-4 pb-32 pt-3" aria-label="Cargando mapa">
      <div className="h-44 animate-pulse rounded-3xl bg-black/5 dark:bg-white/10" />
      {[0, 1].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-3xl bg-black/5 dark:bg-white/10" />
      ))}
    </div>
  )
}

function HistoryRow({ item }: { item: InjectionOut }) {
  const { date, time } = formatAppliedAt(item.applied_at)
  const badge = statusBadge(item.status)
  const [hm, meridiem] = time.split(' ')
  const hour = hm?.split(':')[0] ?? ''
  return (
    <li className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#0a84ff]/10 leading-none">
        <span className="text-[15px] font-bold text-[#0a84ff]">{hour}</span>
        <span className="text-[10px] font-semibold text-[#0a84ff]/70">{meridiem ?? ''}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[15px] font-semibold">{item.microzone_id}</p>
        <p className="text-[13px] text-black/50 dark:text-white/50">
          {date} · {time} · {item.macro}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${badge.className}`}>
        {badge.text}
      </span>
    </li>
  )
}

export type HistoryViewData = {
  data: { pages: { items: InjectionOut[] }[] } | undefined
  isPending: boolean
  isError: boolean
  refetch: () => void
  hasNextPage: boolean | undefined
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

export function HistoryView({ query }: { query: HistoryViewData }) {
  const items = query.data?.pages.flatMap((p) => p.items) ?? []

  if (query.isPending) {
    return (
      <div className="space-y-2 px-4 pb-32 pt-3" aria-label="Cargando historial">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-3xl bg-black/5 dark:bg-white/10" />
        ))}
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-16 text-center">
        <p className="text-[15px] font-semibold">No pudimos cargar tu historial</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="pressable touch-target mt-4 w-full rounded-2xl bg-[#0a84ff] font-semibold text-white"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-16 text-center">
        <p className="text-[15px] font-semibold">Aún no hay aplicaciones registradas</p>
        <p className="mt-1 text-[14px] text-black/50 dark:text-white/50">
          Registra tu primera dosis desde el mapa y aparecerá aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-32 pt-3">
      <ul className="space-y-2">
        {items.map((item) => (
          <HistoryRow key={item.id} item={item} />
        ))}
      </ul>
      {query.hasNextPage && (
        <button
          type="button"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          className="pressable touch-target mt-3 w-full rounded-2xl bg-black/5 font-semibold dark:bg-white/10"
        >
          {query.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
        </button>
      )}
    </div>
  )
}

function SelfHistory() {
  const history = useHistory()
  return <HistoryView query={history} />
}

export function ExportButton({ basePath, filename }: { basePath: string; filename: string }) {
  const [format, setFormat] = useState<'pdf' | 'xlsx' | 'csv'>('pdf')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="px-4 pt-3">
      <div className="flex items-center gap-2 rounded-3xl bg-white p-2 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
        <div className="grid flex-1 grid-cols-3 gap-1" role="group" aria-label="Formato de exporte">
          {(['pdf', 'xlsx', 'csv'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={format === f}
              onClick={() => setFormat(f)}
              className={`touch-target rounded-2xl text-[14px] font-bold uppercase ${format === f ? 'bg-[#0a84ff]/10 text-[#0a84ff]' : 'text-black/50 dark:text-white/50'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            setError(null)
            void downloadExport(`${basePath}/export?format=${format}`, `${filename}.${format}`)
              .catch(() => setError('No se pudo generar el archivo.'))
              .finally(() => setBusy(false))
          }}
          className="pressable touch-target shrink-0 rounded-2xl bg-[#0a84ff] px-4 font-semibold text-white disabled:opacity-60"
        >
          {busy ? '…' : 'Exportar'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-[#ff3b30]">
          {error}
        </p>
      )}
    </div>
  )
}

function LinkSection() {
  const links = useLinks()
  const createCode = useCreateCode()
  const revoke = useRevokeLink()
  const [code, setCode] = useState<{ code: string; expires: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const doctors = links.data?.filter((l) => l.doctor_name) ?? []

  return (
    <section
      aria-label="Compartir con mi médico"
      className="rounded-3xl bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10"
    >
      <h2 className="text-[17px]">Compartir con mi médico</h2>
      <p className="mt-0.5 text-[13px] text-black/50 dark:text-white/50">
        Genera un código de un solo uso, válido 48 h.
      </p>
      {code ? (
        <p className="mt-2 rounded-2xl bg-[#0a84ff]/10 px-4 py-3 text-center font-mono text-[22px] font-bold tracking-[0.2em] text-[#0a84ff]">
          {code.code}
        </p>
      ) : (
        <button
          type="button"
          disabled={createCode.isPending}
          onClick={() => {
            setError(null)
            createCode.mutate(undefined, {
              onSuccess: (c) => setCode({ code: c.code, expires: c.expires_at }),
              onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo generar el código.'),
            })
          }}
          className="pressable touch-target mt-2 w-full rounded-2xl bg-[#0a84ff] font-semibold text-white disabled:opacity-60"
        >
          {createCode.isPending ? 'Generando…' : 'Generar código'}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-[#ff3b30]">
          {error}
        </p>
      )}
      {links.data && doctors.length > 0 && (
        <ul className="mt-3 space-y-2">
          {doctors.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 rounded-2xl bg-black/5 px-3 py-2 dark:bg-white/10">
              <span className="text-[14px] font-medium">{l.doctor_name}</span>
              <button
                type="button"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(l.id)}
                className="pressable shrink-0 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#ff3b30]"
              >
                Revocar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('mapa')
  const { user, logout } = useAuth()
  const mapQuery = useBodyMap()
  const suggestionsQuery = useSuggestions(3)
  const undo = useUndoInjection()
  const setGrid = useSetGridSize()
  const [settingsError, setSettingsError] = useState<string | null>(null)

  const [mapView, setMapView] = useState<'body' | 'list'>('body')
  const [zoom, setZoom] = useState<{ macro: MacroCode; side: 'I' | 'D'; highlight: string | null } | null>(null)
  const [sheetCell, setSheetCell] = useState<CellOut | null>(null)
  const [toast, setToast] = useState<{ id: string; text: string; canUndo: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const topSuggestion = suggestionsQuery.data?.suggestions[0] ?? null

  function locate(id: string) {
    const macro = parseMacro(id)
    if (!macro) return
    setZoom({ macro, side: parseSide(id) ?? 'I', highlight: id })
    setMapView('body')
  }

  async function doUndo() {
    setError(null)
    try {
      await undo.mutateAsync()
      setToast(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo deshacer.')
    }
  }

  const gridSize = mapQuery.data?.grid_size ?? 4

  return (
    <div className="mx-auto min-h-svh w-full max-w-lg bg-[#f2f2f7] text-[#1c1c1e] dark:bg-black dark:text-[#f2f2f7]">
      <header className="chrome-translucent sticky top-0 z-10 border-b border-black/5 px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))] dark:border-white/10">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#0a84ff]">Insumap</p>
        <h1 className="text-[28px] leading-tight">
          {tab === 'mapa' && 'Mapa corporal'}
          {tab === 'historial' && 'Historial'}
          {tab === 'recordatorios' && 'Mis dosis'}
          {tab === 'asistente' && 'Asistente'}
          {tab === 'perfil' && 'Perfil'}
        </h1>
      </header>

      <motion.main
        key={tab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {tab === 'mapa' && (
          <>
            {mapQuery.isPending && <MapSkeleton />}
            {mapQuery.isError && (
              <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-16 text-center">
                <p className="text-[15px] font-semibold">No pudimos cargar tu mapa</p>
                <p className="mt-1 text-[14px] text-black/50 dark:text-white/50">Revisa tu conexión e inténtalo de nuevo.</p>
                <button
                  type="button"
                  onClick={() => mapQuery.refetch()}
                  className="pressable touch-target mt-4 w-full rounded-2xl bg-[#0a84ff] font-semibold text-white"
                >
                  Reintentar
                </button>
              </div>
            )}
            {mapQuery.data && (
              <div className="space-y-3 px-4 pb-32 pt-3">
                {topSuggestion && !zoom && (
                  <section
                    aria-label="Sugerencia para la próxima dosis"
                    className="rounded-3xl bg-[#0a84ff] p-4 text-white shadow-[0_8px_24px_rgb(10_132_255/0.35)]"
                  >
                    <p className="text-[13px] font-semibold uppercase tracking-wide text-white/70">★ Sugerido ahora</p>
                    <p className="mt-0.5 text-[20px] font-bold leading-snug">
                      {describeLocation(topSuggestion.microzone_id, gridSize)}{' '}
                      <span className="font-mono text-[15px]">({topSuggestion.microzone_id})</span>
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => locate(topSuggestion.microzone_id)}
                        className="pressable touch-target rounded-2xl bg-white font-semibold text-[#0a84ff]"
                      >
                        Ver en el mapa
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('asistente')}
                        className="pressable touch-target rounded-2xl bg-white/20 font-semibold text-white"
                      >
                        ¿Por qué?
                      </button>
                    </div>
                  </section>
                )}

                {error && (
                  <p role="alert" className="rounded-2xl bg-[#ff3b30]/10 px-4 py-3 text-[14px] font-medium text-[#ff3b30]">
                    {error}
                  </p>
                )}

                {zoom ? (
                  <div className="rounded-3xl bg-white py-2 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
                    <ZoomGrid
                      key={`${zoom.macro}-${zoom.side}`}
                      macro={zoom.macro}
                      map={mapQuery.data}
                      gridSize={gridSize}
                      initialSide={zoom.side}
                      highlightId={zoom.highlight}
                      onBack={() => setZoom(null)}
                      onSelect={(cell) => setSheetCell(cell)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="mx-auto grid w-56 grid-cols-2 gap-1 rounded-2xl bg-black/5 p-1 dark:bg-white/10" role="group" aria-label="Modo de mapa">
                      {(['body', 'list'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={mapView === m}
                          onClick={() => setMapView(m)}
                          className={`touch-target rounded-xl text-[14px] font-semibold ${
                            mapView === m ? 'bg-white shadow dark:bg-[#1c1c1e]' : 'text-black/50 dark:text-white/50'
                          }`}
                        >
                          {m === 'body' ? 'Cuerpo' : 'Lista'}
                        </button>
                      ))}
                    </div>

                    {mapView === 'body' ? (
                      <div className="rounded-3xl bg-white py-3 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
                        <BodyMap
                          map={mapQuery.data}
                          suggestionId={topSuggestion?.microzone_id ?? null}
                          onSelectMacro={(macro) => setZoom({ macro, side: 'I', highlight: null })}
                        />
                      </div>
                    ) : (
                      mapQuery.data.zones.map((z) => (
                        <MacroCard key={z.macro} zone={z} gridSize={gridSize} onTap={(cell) => setSheetCell(cell)} />
                      ))
                    )}
                  </>
                )}

                <p className="px-1 pt-1 text-[12px] leading-relaxed text-black/40 dark:text-white/40">
                  Proyecto académico de apoyo a la rotación. No es un dispositivo médico.
                </p>
              </div>
            )}
          </>
        )}
        {tab === 'historial' && (
          <>
            <ExportButton basePath="/history" filename="insumap-historial" />
            <SelfHistory />
          </>
        )}
        {tab === 'recordatorios' && <Reminders />}
        {tab === 'asistente' && <Assistant />}
        {tab === 'perfil' && (
          <div className="space-y-3 px-4 pb-32 pt-3">
            <section className="rounded-3xl bg-white p-4 text-center shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
              <p className="text-[20px] font-bold">{user?.name}</p>
              <p className="mt-0.5 text-[14px] text-black/50 dark:text-white/50">
                {user?.email} · {user?.role === 'DOCTOR' ? 'Médico' : 'Paciente'}
              </p>
            </section>

            <section
              aria-label="Tamaño de la cuadrícula"
              className="rounded-3xl bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10"
            >
              <h2 className="text-[17px]">Cuadrícula por lado</h2>
              <p className="mt-0.5 text-[13px] text-black/50 dark:text-white/50">
                Cambiarla reproyecta tu historial a la nueva cuadrícula.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Tamaño de cuadrícula">
                {([2, 4, 6] as GridSize[]).map((n) => {
                  const active = gridSize === n
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={setGrid.isPending}
                      aria-pressed={active}
                      onClick={() => {
                        if (n === gridSize) return
                        setSettingsError(null)
                        setGrid.mutate(n, {
                          onError: (err) =>
                            setSettingsError(
                              err instanceof ApiError ? err.message : 'No se pudo cambiar la cuadrícula.',
                            ),
                        })
                      }}
                      className={`touch-target pressable rounded-2xl border text-[16px] font-bold disabled:opacity-60 ${
                        active
                          ? 'border-[#0a84ff] bg-[#0a84ff]/10 text-[#0a84ff]'
                          : 'border-black/10 text-black/60 dark:border-white/10 dark:text-white/60'
                      }`}
                    >
                      {n}×{n}
                    </button>
                  )
                })}
              </div>
              {settingsError && (
                <p role="alert" className="mt-2 text-[13px] text-[#ff3b30]">
                  {settingsError}
                </p>
              )}
            </section>

            {user?.role !== 'DOCTOR' && <LinkSection />}

            <button
              type="button"
              onClick={() => void logout()}
              className="pressable touch-target w-full rounded-2xl bg-[#ff3b30]/10 font-semibold text-[#ff3b30]"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </motion.main>

      {/* Toast con deshacer */}
      <AnimatePresence>
        {toast && tab === 'mapa' && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-x-0 bottom-24 z-20 mx-auto w-full max-w-lg px-4"
          >
            <div className="chrome-translucent flex items-center justify-between gap-3 rounded-3xl border border-black/5 px-4 py-3 shadow-lg dark:border-white/10">
              <p className="text-[14px] font-medium">{toast.text}</p>
              {toast.canUndo && (
                <button
                  type="button"
                  disabled={undo.isPending}
                  onClick={() => void doUndo()}
                  className="pressable shrink-0 rounded-2xl bg-[#0a84ff] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-60"
                >
                  {undo.isPending ? '…' : 'Deshacer'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hoja P05: detalle de microzona + registro */}
      <AnimatePresence>
        {sheetCell && (
          <MicrozoneSheet
            cell={sheetCell}
            gridSize={gridSize}
            suggestedId={topSuggestion?.microzone_id ?? null}
            onClose={() => setSheetCell(null)}
            onRegistered={(id, microzoneId, canUndo) => {
              setSheetCell(null)
              setToast({ id, text: `Registrada en ${microzoneId}.`, canUndo })
            }}
            onUseSuggested={(id) => locate(id)}
          />
        )}
      </AnimatePresence>

      <nav
        aria-label="Navegación principal"
        className="chrome-translucent fixed inset-x-0 bottom-0 z-10 border-t border-black/5 dark:border-white/10"
      >
        <div className="mx-auto grid w-full max-w-lg grid-cols-5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setTab(t.id)}
                className={`touch-target pressable flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold ${
                  active ? 'text-[#0a84ff]' : 'text-black/40 dark:text-white/40'
                }`}
              >
                <motion.span
                  aria-hidden="true"
                  className="text-[20px] leading-none"
                  animate={{ scale: active ? 1.15 : 1 }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                >
                  {t.icon}
                </motion.span>
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
