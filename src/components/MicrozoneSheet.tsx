import { useState } from 'react'
import { motion } from 'motion/react'
import { ApiError } from '../lib/api'
import { useRegisterInjection } from '../lib/injections'
import type { CellOut } from '../lib/injections'
import { formatAppliedAt } from '../lib/history'
import { MACRO_LABEL, macroSideCells } from './BodyMap'
import type { MacroCode } from './BodyMap'
import type { MapResponse } from '../lib/injections'

const CELL_STYLE: Record<CellOut['color'], string> = {
  RED: 'bg-[#ff3b30]/15 text-[#ff3b30] pattern-red',
  YELLOW: 'bg-[#ffcc00]/20 text-[#8a6d00] pattern-yellow dark:text-[#ffd60a]',
  GREEN: 'bg-[#34c759]/15 text-[#248a3d] pattern-green dark:text-[#30d158]',
}

const CELL_ICON: Record<CellOut['color'], string> = { RED: '✕', YELLOW: '!', GREEN: '✓' }

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
          className="pressable touch-target w-11 rounded-2xl bg-black/5 text-[20px] dark:bg-white/10"
        >
          ‹
        </button>
        <h2 className="text-[20px]">{MACRO_LABEL[macro]}</h2>
        <div className="ml-auto grid grid-cols-2 gap-1 rounded-2xl bg-black/5 p-1 dark:bg-white/10" role="group" aria-label="Lado">
          {(['I', 'D'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={side === s}
              onClick={() => setSide(s)}
              className={`touch-target rounded-xl px-3 text-[14px] font-semibold ${side === s ? 'bg-white shadow dark:bg-[#1c1c1e]' : 'text-black/50 dark:text-white/50'}`}
            >
              {s === 'I' ? 'Izq.' : 'Der.'}
            </button>
          ))}
        </div>
      </div>
      <div className={`mt-3 grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="group" aria-label={`Cuadrícula ${MACRO_LABEL[macro]} lado ${side}`}>
        {cells.map((cell) => (
          <button
            key={cell.id}
            type="button"
            aria-label={`Microzona ${cell.id}, ${cell.color === 'RED' ? 'roja' : cell.color === 'YELLOW' ? 'amarilla' : 'verde'}`}
            data-microzone={cell.id}
            onClick={() => onSelect(cell)}
            className={`touch-target pressable flex aspect-square items-center justify-center rounded-2xl text-[18px] font-bold ${CELL_STYLE[cell.color]} ${highlightId === cell.id ? 'ring-4 ring-[#0a84ff]' : ''}`}
          >
            <span aria-hidden="true">{CELL_ICON[cell.color]}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-black/40 dark:text-white/40">
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
        className="fixed inset-0 z-30 bg-black/30"
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
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg rounded-t-3xl bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 dark:bg-[#1c1c1e]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 dark:bg-white/20" aria-hidden="true" />
        <p className="text-[13px] text-black/50 dark:text-white/50">
          {macro === 'ABD' ? 'Abdomen' : macro === 'MUS' ? 'Muslo' : macro === 'BRA' ? 'Brazo' : 'Glúteo'} {sideLabel} · F{row} C{col} · {gridSize}×{gridSize}
        </p>
        <h2 className="font-mono text-[20px] font-bold">{cell.id}</h2>
        <p className="mt-1 text-[15px]">
          <strong className={cell.color === 'GREEN' ? 'text-[#248a3d] dark:text-[#30d158]' : cell.color === 'YELLOW' ? 'text-[#b26a00]' : 'text-[#ff3b30]'}>
            {COLOR_WORD[cell.color]} · {pct}% recup.
          </strong>{' '}
          <span className="text-black/60 dark:text-white/60">
            {cell.hours_remaining <= 0 ? 'Disponible ahora' : `Disponible en ~${Math.round(cell.hours_remaining)} h`}
          </span>
        </p>
        <p className="text-[14px] text-black/50 dark:text-white/50">
          {last ? `Último uso: ${last.date} ${last.time}` : 'Nunca usada'} · {cell.uses_30d} usos en 30 días
        </p>

        {!warn ? (
          <>
            <div className="mt-3">
              <p className="text-[14px] font-semibold">Hora de aplicación</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={timeMode === 'now'}
                  onClick={() => setTimeMode('now')}
                  className={`touch-target rounded-2xl border text-[15px] font-semibold ${timeMode === 'now' ? 'border-[#0a84ff] bg-[#0a84ff]/10 text-[#0a84ff]' : 'border-black/10 dark:border-white/10'}`}
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
                  className="touch-target rounded-2xl border border-black/10 bg-[#f2f2f7] px-3 text-[15px] dark:border-white/10 dark:bg-black"
                />
              </div>
            </div>
            {error && (
              <p role="alert" className="mt-2 text-[13px] text-[#ff3b30]">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={register.isPending}
              onClick={() => (cell.color === 'GREEN' ? submit(false) : setWarn(true))}
              className="pressable touch-target mt-3 w-full rounded-2xl bg-[#0a84ff] font-semibold text-white disabled:opacity-60"
            >
              {register.isPending ? 'Registrando…' : 'Registrar inyección'}
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 rounded-2xl bg-[#ff9f0a]/15 px-4 py-3 text-[14px] text-[#b26a00] dark:text-[#ffd60a]">
              ⚠ Esta zona aún no se recupera ({COLOR_WORD[cell.color]}). Puedes usarla igual, pero te sugerimos{' '}
              {suggestedId ?? 'otra microzona'}.
            </p>
            {error && (
              <p role="alert" className="mt-2 text-[13px] text-[#ff3b30]">
                {error}
              </p>
            )}
            <div className="mt-3 space-y-2">
              {suggestedId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onUseSuggested(suggestedId)
                  }}
                  className="pressable touch-target w-full rounded-2xl bg-[#0a84ff] font-semibold text-white"
                >
                  Usar sugerida ({suggestedId})
                </button>
              )}
              <button
                type="button"
                disabled={register.isPending}
                onClick={() => submit(true)}
                className="pressable touch-target w-full rounded-2xl bg-black/5 font-semibold dark:bg-white/10"
              >
                {register.isPending ? 'Registrando…' : 'Registrar igual'}
              </button>
              <button
                type="button"
                onClick={() => setWarn(false)}
                className="pressable touch-target w-full rounded-2xl font-semibold text-[#0a84ff]"
              >
                Atrás
              </button>
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}
