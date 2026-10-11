import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  BellRing,
  Check,
  Copy,
  FileDown,
  History as HistoryIcon,
  KeyRound,
  LogOut,
  Map as MapIcon,
  Sparkles,
  Star,
  Syringe,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { AppShell } from '../components/AppShell'
import Body3D from '../components/Body3D'
import { parseMacro, parseSide } from '../lib/body'
import type { MacroCode } from '../lib/body'
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
import { Avatar, Button, Card, EmptyState, ErrorState, FieldError, SkeletonList, Tile } from '../components/ui'

export type Tab = 'mapa' | 'historial' | 'dosis' | 'ayuda' | 'perfil'

const TABS: { id: Tab; label: string; Icon: typeof MapIcon }[] = [
  { id: 'mapa', label: 'Mapa', Icon: MapIcon },
  { id: 'historial', label: 'Historial', Icon: HistoryIcon },
  { id: 'dosis', label: 'Dosis', Icon: BellRing },
  { id: 'ayuda', label: 'Ayuda', Icon: Sparkles },
  { id: 'perfil', label: 'Perfil', Icon: UserRound },
]

const CELL_STYLE: Record<CellOut['color'], string> = {
  RED: 'bg-mz-red-soft text-mz-red pattern-red',
  YELLOW: 'bg-mz-yellow-soft text-mz-yellow pattern-yellow',
  GREEN: 'bg-mz-green-soft text-mz-green pattern-green',
}

const CELL_ICON: Record<CellOut['color'], typeof Check> = { RED: X, YELLOW: TriangleAlert, GREEN: Check }

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
    <Card label={zone.label}>
      <h2 className="text-[17px]">{zone.label}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {zone.sides.map((s) => (
          <div key={s.side}>
            <p className="mb-1 text-[12px] font-extrabold text-muted dark:text-muted-dark">
              {s.side === 'I' ? 'Izquierdo' : 'Derecho'}
            </p>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="group" aria-label={`${zone.label} lado ${s.side}`}>
              {s.cells.map((cell) => {
                const Icon = CELL_ICON[cell.color]
                return (
                  <button
                    key={cell.id}
                    type="button"
                    aria-label={`Microzona ${cell.id}, ${COLOR_LABEL[cell.color]}`}
                    data-microzone={cell.id}
                    onClick={() => onTap(cell)}
                    className={`touch-target pressable focus-ring flex items-center justify-center rounded-xl ${CELL_STYLE[cell.color]}`}
                  >
                    <Icon aria-hidden="true" size={16} strokeWidth={3} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function MapSkeleton() {
  return (
    <div className="space-y-3 px-4 pt-3" aria-label="Cargando mapa">
      <div className="h-36 animate-pulse rounded-[24px] bg-bubble/70 dark:bg-white/10" />
      <div className="h-[420px] animate-pulse rounded-[24px] bg-primary-soft/70 dark:bg-white/10" />
    </div>
  )
}

function HistoryRow({ item }: { item: InjectionOut }) {
  const { date, time } = formatAppliedAt(item.applied_at)
  const badge = statusBadge(item.status)
  const [hm, meridiem] = time.split(' ')
  const hour = hm?.split(':')[0] ?? ''
  return (
    <li className="card flex items-center gap-3 px-4 py-3">
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary-soft leading-none dark:bg-white/10">
        <span className="text-[15px] font-extrabold text-primary-ink dark:text-primary-dark">{hour}</span>
        <span className="text-[10px] font-extrabold text-primary-ink/70 dark:text-primary-dark/70">{meridiem ?? ''}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[15px] font-bold">{item.microzone_id}</p>
        <p className="text-[13px] font-semibold text-muted dark:text-muted-dark">
          {date} · {time} · {item.macro}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-extrabold ${badge.className}`}>
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
      <div className="px-4 pt-3 lg:px-8">
        <SkeletonList label="Cargando historial" />
      </div>
    )
  }

  if (query.isError) {
    return <ErrorState title="No pudimos cargar tu historial" onRetry={() => query.refetch()} />
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Aún no hay aplicaciones registradas"
        hint="Registra tu primera dosis desde el mapa y aparecerá aquí."
      />
    )
  }

  return (
    <div className="px-4 pt-3 lg:px-8">
      <ul className="space-y-2">
        {items.map((item) => (
          <HistoryRow key={item.id} item={item} />
        ))}
      </ul>
      {query.hasNextPage && (
        <Button
          variant="soft"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          className="mt-3 w-full"
        >
          {query.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
        </Button>
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
    <div className="px-4 pt-3 lg:px-8">
      <Card>
        <div className="flex items-center gap-2">
          <div className="grid flex-1 grid-cols-3 gap-1" role="group" aria-label="Formato de exporte">
            {(['pdf', 'xlsx', 'csv'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={format === f}
                onClick={() => setFormat(f)}
                className={`touch-target focus-ring rounded-2xl text-[14px] font-extrabold uppercase ${format === f ? 'bg-primary-soft text-primary-ink dark:bg-white/10 dark:text-primary-dark' : 'text-muted dark:text-muted-dark'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true)
              setError(null)
              void downloadExport(`${basePath}/export?format=${format}`, `${filename}.${format}`)
                .catch(() => setError('No se pudo generar el archivo.'))
                .finally(() => setBusy(false))
            }}
            className="shrink-0"
          >
            <span className="inline-flex items-center gap-1.5">
              <FileDown aria-hidden="true" size={18} />
              {busy ? '…' : 'Exportar'}
            </span>
          </Button>
        </div>
      </Card>
      <FieldError message={error ?? undefined} />
    </div>
  )
}

function LinkSection() {
  const links = useLinks()
  const createCode = useCreateCode()
  const revoke = useRevokeLink()
  const [code, setCode] = useState<{ code: string; expires: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const doctors = links.data?.filter((l) => l.doctor_name) ?? []

  return (
    <Card label="Compartir con mi médico">
      <h2 className="flex items-center gap-2 text-[17px]">
        <KeyRound aria-hidden="true" size={18} className="text-primary dark:text-primary-dark" />
        Compartir con mi médico
      </h2>
      <p className="mt-0.5 text-[13px] font-semibold text-muted dark:text-muted-dark">
        Genera un código de un solo uso, válido 48 h.
      </p>
      {code ? (
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 dark:bg-white/10">
          <p className="flex-1 text-center font-mono text-[22px] font-black tracking-[0.2em] text-primary-ink dark:text-primary-dark">
            {code.code}
          </p>
          <button
            type="button"
            aria-label="Copiar código"
            onClick={() => {
              void navigator.clipboard?.writeText(code.code).then(
                () => setCopied(true),
                () => setCopied(false),
              )
            }}
            className="pressable focus-ring touch-target w-11 shrink-0 rounded-2xl text-primary-ink dark:text-primary-dark"
          >
            {copied ? <Check aria-hidden="true" size={20} className="mx-auto" /> : <Copy aria-hidden="true" size={20} className="mx-auto" />}
          </button>
        </div>
      ) : (
        <Button
          disabled={createCode.isPending}
          onClick={() => {
            setError(null)
            createCode.mutate(undefined, {
              onSuccess: (c) => setCode({ code: c.code, expires: c.expires_at }),
              onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo generar el código.'),
            })
          }}
          className="mt-2 w-full"
        >
          {createCode.isPending ? 'Generando…' : 'Generar código'}
        </Button>
      )}
      <FieldError message={error ?? undefined} />
      {links.data && doctors.length > 0 && (
        <ul className="mt-3 space-y-2">
          {doctors.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 rounded-2xl bg-primary-soft/70 px-3 py-2 dark:bg-white/10">
              <span className="text-[14px] font-bold">{l.doctor_name}</span>
              <button
                type="button"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(l.id)}
                className="pressable focus-ring shrink-0 rounded-xl px-3 py-2 text-[13px] font-extrabold text-mz-red"
              >
                Revocar
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Home({ tab, onTabChange }: { tab: Tab; onTabChange: (t: Tab) => void }) {
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
    <AppShell
      greeting="Hola,"
      title={user?.name ?? 'Insumap'}
      userName={user?.name}
      tabs={TABS}
      active={tab}
      onChange={(id) => onTabChange(id as Tab)}
    >
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
              <ErrorState title="No pudimos cargar tu mapa" hint="Revisa tu conexión e inténtalo de nuevo." onRetry={() => mapQuery.refetch()} />
            )}
            {mapQuery.data && (
              <div className="space-y-3 px-4 pt-3 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] md:items-start md:gap-5 md:space-y-0 lg:px-8">
                {topSuggestion && !zoom && (
                  <section
                    aria-label="Sugerencia para la próxima dosis"
                    className="rounded-[24px] bg-bubble p-4 md:sticky md:top-24 md:col-start-2 md:row-start-1"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-bubble-ink"
                      >
                        <Syringe size={24} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wide text-bubble-ink">
                          <Star aria-hidden="true" size={14} strokeWidth={2.6} />
                          Sugerido ahora
                        </p>
                        <p className="mt-0.5 text-[17px] font-extrabold leading-snug text-plum-strong dark:text-plum-dark">
                          {describeLocation(topSuggestion.microzone_id, gridSize)}{' '}
                          <span className="font-mono text-[13px]">({topSuggestion.microzone_id})</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => locate(topSuggestion.microzone_id)}
                        className="pressable focus-ring touch-target rounded-2xl bg-primary font-extrabold text-white"
                      >
                        Ver en el mapa
                      </button>
                      <button
                        type="button"
                        onClick={() => onTabChange('ayuda')}
                        className="pressable focus-ring touch-target rounded-2xl bg-white font-extrabold text-primary-ink"
                      >
                        ¿Por qué?
                      </button>
                    </div>
                  </section>
                )}

                {error && (
                  <p role="alert" className="flex items-start gap-2 rounded-2xl bg-mz-red-soft px-4 py-3 text-[14px] font-bold text-mz-red">
                    <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                    {error}
                  </p>
                )}

                {zoom ? (
                  <Card className="py-2 md:col-span-2">
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
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 md:col-start-1">
                      <Tile tone="sky" Icon={HistoryIcon} label="Historial" onClick={() => onTabChange('historial')} />
                      <Tile tone="lemon" Icon={BellRing} label="Mis dosis" onClick={() => onTabChange('dosis')} />
                      <Tile tone="mint" Icon={Sparkles} label="Asistente" onClick={() => onTabChange('ayuda')} />
                    </div>

                    <div className="mx-auto grid w-56 grid-cols-2 gap-1 rounded-2xl bg-primary-soft p-1 md:col-start-1 md:mx-0 dark:bg-white/10" role="group" aria-label="Modo de mapa">
                      {(['body', 'list'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={mapView === m}
                          onClick={() => setMapView(m)}
                          className={`touch-target focus-ring rounded-xl text-[14px] font-extrabold ${
                            mapView === m ? 'bg-card shadow dark:bg-card-dark' : 'text-muted dark:text-muted-dark'
                          }`}
                        >
                          {m === 'body' ? 'Cuerpo 3D' : 'Lista'}
                        </button>
                      ))}
                    </div>

                    {mapView === 'body' ? (
                      <Card className="overflow-hidden p-2">
                        <Body3D
                          map={mapQuery.data}
                          suggestionMacro={topSuggestion ? parseMacro(topSuggestion.microzone_id) : null}
                          onSelectMacro={(macro) => setZoom({ macro, side: 'I', highlight: null })}
                        />
                      </Card>
                    ) : (
                      mapQuery.data.zones.map((z) => (
                        <MacroCard key={z.macro} zone={z} gridSize={gridSize} onTap={(cell) => setSheetCell(cell)} />
                      ))
                    )}
                  </>
                )}

                <p className="px-1 pt-1 text-[12px] font-semibold text-muted md:col-span-2 dark:text-muted-dark">
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
        {tab === 'dosis' && <Reminders />}
        {tab === 'ayuda' && <Assistant />}
        {tab === 'perfil' && (
          <div className="space-y-3 px-4 pt-3 md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0 lg:px-8">
            <Card className="flex items-center gap-4">
              <Avatar name={user?.name ?? '?'} size={56} />
              <div className="min-w-0">
                <p className="truncate text-[19px] font-black">{user?.name}</p>
                <p className="truncate text-[14px] font-semibold text-muted dark:text-muted-dark">
                  {user?.email} · {user?.role === 'DOCTOR' ? 'Médico' : 'Paciente'}
                </p>
              </div>
            </Card>

            <Card label="Tamaño de la cuadrícula">
              <h2 className="text-[17px]">Cuadrícula por lado</h2>
              <p className="mt-0.5 text-[13px] font-semibold text-muted dark:text-muted-dark">
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
                      className={`touch-target pressable focus-ring rounded-2xl text-[16px] font-extrabold disabled:opacity-60 ${
                        active
                          ? 'bg-primary text-white'
                          : 'bg-primary-soft text-primary-ink dark:bg-white/10 dark:text-primary-dark'
                      }`}
                    >
                      {n}×{n}
                    </button>
                  )
                })}
              </div>
              <FieldError message={settingsError ?? undefined} />
            </Card>

            {user?.role !== 'DOCTOR' && <LinkSection />}

            <Button variant="danger-soft" onClick={() => void logout()} className="w-full">
              <span className="inline-flex items-center gap-2">
                <LogOut aria-hidden="true" size={18} />
                Cerrar sesión
              </span>
            </Button>
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
            className="fixed inset-x-0 bottom-28 z-20 mx-auto w-full max-w-lg px-4 lg:bottom-10 lg:left-72 lg:right-auto lg:max-w-md"
          >
            <div className="chrome-translucent flex items-center justify-between gap-3 rounded-[24px] border border-white/70 px-4 py-3 shadow-lg dark:border-white/10">
              <p className="text-[14px] font-bold">{toast.text}</p>
              {toast.canUndo && (
                <Button
                  disabled={undo.isPending}
                  onClick={() => void doUndo()}
                  className="shrink-0"
                >
                  {undo.isPending ? '…' : 'Deshacer'}
                </Button>
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
    </AppShell>
  )
}
