import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Check, TriangleAlert, X } from 'lucide-react'
import { ApiError } from '../lib/api'
import { useRegisterInjection } from '../lib/injections'
import type { CellOut } from '../lib/injections'
import { formatAppliedAt } from '../lib/history'
import { MACRO_LABEL, macroSideCells } from '../lib/body'
import type { MacroCode } from '../lib/body'
import type { MapResponse } from '../lib/injections'
import { Button, FieldError } from './ui'

const CELL_STYLE: Record<CellOut['color'], string> = {
  RED: 'bg-mz-red-soft text-mz-red pattern-red',
  YELLOW: 'bg-mz-yellow-soft text-mz-yellow pattern-yellow',
  GREEN: 'bg-mz-green-soft text-mz-green pattern-green',
}

const CELL_ICON: Record<CellOut['color'], typeof Check> = { RED: X, YELLOW: TriangleAlert, GREEN: Check }

export function ZoomGrid({ macro, map, gridSize, initialSide, highlightId, onBack, onSelect }: {
  macro: MacroCode
  map: MapResponse
  gridSize: number
  initialSide: 'I' | 'D'
  highlightId: string | null
  onBack: () => void
  onSelect: (cell: CellOut) => void
}) {
  const [side, setSide] = useState<'I' | 'D'>(initialSide)
  const cells = macroSideCells(map, macro, side)
  const cols = gridSize <= 2 ? 2 : gridSize <= 4 ? 4 : 3

  return (
    <div className="px-4 pb-4 pt-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver al cuerpo"
          className="pressable focus-ring touch-target w-11 rounded-2xl bg-primary-soft text-primary-ink dark:bg-white/10 dark:text-primary-dark"
        >
          <ArrowLeft aria-hidden="true" size={20} className="mx-auto" />
        </button>
        <h2 className="text-[20px]">{MACRO_LABEL[macro]}</h2>
        <div className="ml-auto grid grid-cols-2 gap-1 rounded-2xl bg-primary-soft p-1 dark:bg-white/10" role="group" aria-label="Lado">
          {(['I', 'D'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={side === s}
              onClick={() => setSide(s)}
              className={`touch-target focus-ring rounded-xl px-3 text-[14px] font-extrabold ${side === s ? 'bg-card shadow dark:bg-card-dark' : 'text-muted dark:text-muted-dark'}`}
            >
              {s === 'I' ? 'Izq.' : 'Der.'}
            </button>
          ))}
        </div>
      </div>
      <div className={`mt-3 grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="group" aria-label={`Cuadrícula ${MACRO_LABEL[macro]} lado ${side}`}>
        {cells.map((cell) => {
          const Icon = CELL_ICON[cell.color]
          return (
            <button
              key={cell.id}
              type="button"
              aria-label={`Microzona ${cell.id}, ${cell.color === 'RED' ? 'roja' : cell.color === 'YELLOW' ? 'amarilla' : 'verde'}`}
              data-microzone={cell.id}
              onClick={() => onSelect(cell)}
              className={`touch-target pressable focus-ring flex aspect-square items-center justify-center rounded-2xl ${CELL_STYLE[cell.color]} ${highlightId === cell.id ? 'ring-4 ring-primary' : ''}`}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={3} />
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[12px] font-semibold text-muted dark:text-muted-dark">
        Con 6×6 la cuadrícula se compacta para mantener objetivos ≥44px.
      </p>
    </div>
  )
}

const COLOR_WORD: Record<CellOut['color'], string> = { RED: 'ROJO', YELLOW: 'AMARILLO', GREEN: 'VERDE' }

export function MicrozoneSheet({ cell, gridSize, suggestedId, onClose, onRegistered, onUseSuggested }: {
  cell: CellOut
  gridSize: number
  suggestedId: string | null
  onClose: () => void
  onRegistered: (injectionId: string, microzoneId: string, canUndo: boolean) => void
  onUseSuggested: (id: string) => void
}) {
  const register = useRegisterInjection()
  const [warn, setWarn] = useState(false)
  const [timeMode, setTimeMode] = useState<'now' | 'custom'>('now')
  const [customTime, setCustomTime] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [macro, side, row, col] = cell.id.split('-')
  const sideLabel = side === 'I' ? 'izq.' : 'der.'
  const pct = Math.min(100, Math.round(cell.ratio * 100))
  const last = cell.last_used ? formatAppliedAt(cell.last_used) : null

  function appliedAt(): string | null {
    if (timeMode === 'now') return null
    if (!customTime) {
      setError('Elige una hora o usa «Ahora».')
      return undefined as unknown as null
    }
    const chosen = new Date(customTime)
    if (chosen.getTime() > Date.now()) {
      setError('La hora no puede estar en el futuro.')
      return undefined as unknown as null
    }
    return chosen.toISOString()
  }

  function submit(confirm: boolean) {
    const at = appliedAt()
    if (at === (undefined as unknown as null)) return
    setError(null)
    register.mutate(
      { microzone_id: cell.id, confirm_not_recovered: confirm, origin: 'MAP', applied_at: at },
      {
        onSuccess: (res) => {
          onClose()
          onRegistered(res.injection.id, cell.id, res.can_undo)
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'MICROZONE_NOT_RECOVERED') setWarn(true)
          else setError(err instanceof ApiError ? err.message : 'No se pudo registrar.')
        },
      },
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-30 bg-plum/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Microzona ${cell.id}`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg rounded-t-[28px] bg-card px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 dark:bg-card-dark"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-primary-soft dark:bg-white/20" aria-hidden="true" />
        <p className="text-[13px] font-semibold text-muted dark:text-muted-dark">
          {macro === 'ABD' ? 'Abdomen' : macro === 'MUS' ? 'Muslo' : macro === 'BRA' ? 'Brazo' : 'Glúteo'} {sideLabel} · F{row} C{col} · {gridSize}×{gridSize}
        </p>
        <h2 className="font-mono text-[20px] font-black">{cell.id}</h2>
        <p className="mt-1 text-[15px]">
          <strong className={cell.color === 'GREEN' ? 'text-mz-green' : cell.color === 'YELLOW' ? 'text-mz-yellow' : 'text-mz-red'}>
            {COLOR_WORD[cell.color]} · {pct}% recup.
          </strong>{' '}
          <span className="font-semibold text-muted dark:text-muted-dark">
            {cell.hours_remaining <= 0 ? 'Disponible ahora' : `Disponible en ~${Math.round(cell.hours_remaining)} h`}
          </span>
        </p>
        <p className="text-[14px] font-semibold text-muted dark:text-muted-dark">
          {last ? `Último uso: ${last.date} ${last.time}` : 'Nunca usada'} · {cell.uses_30d} usos en 30 días
        </p>

        {!warn ? (
          <>
            <div className="mt-3">
              <p className="text-[14px] font-extrabold">Hora de aplicación</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={timeMode === 'now'}
                  onClick={() => setTimeMode('now')}
                  className={`touch-target focus-ring rounded-2xl text-[15px] font-extrabold ${timeMode === 'now' ? 'bg-primary-soft text-primary-ink dark:bg-white/10 dark:text-primary-dark' : 'bg-primary-soft/50 text-muted dark:bg-white/5 dark:text-muted-dark'}`}
                >
                  Ahora
                </button>
                <input
                  type="datetime-local"
                  aria-label="Elegir hora de aplicación"
                  value={customTime}
                  onChange={(e) => {
                    setCustomTime(e.target.value)
                    setTimeMode('custom')
                  }}
                  className="touch-target focus-ring rounded-2xl border border-transparent bg-primary-soft/80 px-3 text-[15px] dark:bg-white/10"
                />
              </div>
            </div>
            <FieldError message={error ?? undefined} />
            <Button
              disabled={register.isPending}
              onClick={() => (cell.color === 'GREEN' ? submit(false) : setWarn(true))}
              className="mt-3 w-full"
            >
              {register.isPending ? 'Registrando…' : 'Registrar inyección'}
            </Button>
          </>
        ) : (
          <>
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-mz-yellow-soft px-4 py-3 text-[14px] font-bold text-mz-yellow">
              <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
              <span>
                Esta zona aún no se recupera ({COLOR_WORD[cell.color]}). Puedes usarla igual, pero te sugerimos{' '}
                {suggestedId ?? 'otra microzona'}.
              </span>
            </p>
            <FieldError message={error ?? undefined} />
            <div className="mt-3 space-y-2">
              {suggestedId && (
                <Button
                  onClick={() => {
                    onClose()
                    onUseSuggested(suggestedId)
                  }}
                  className="w-full"
                >
                  Usar sugerida ({suggestedId})
                </Button>
              )}
              <Button
                variant="soft"
                disabled={register.isPending}
                onClick={() => submit(true)}
                className="w-full"
              >
                {register.isPending ? 'Registrando…' : 'Registrar igual'}
              </Button>
              <Button variant="ghost" onClick={() => setWarn(false)} className="w-full">
                Atrás
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}
