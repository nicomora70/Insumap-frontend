import { useEffect, useState } from 'react'
import { BellOff, BellRing, Check, Clock, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '../lib/api'
import { useRegisterInjection } from '../lib/injections'
import {
  ensurePushSubscription,
  useConfirmReminder,
  useSaveSchedule,
  useSchedule,
  useSnoozeReminder,
  useUpcoming,
} from '../lib/reminders'
import type { DoseIn, ReminderOut } from '../lib/reminders'
import { Button, Card, FieldError } from '../components/ui'

function formatDue(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return `Hoy ${time}`
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} ${time}`
}

const inputSm =
  'focus-ring touch-target rounded-2xl border border-transparent bg-primary-soft/80 px-3 text-[16px] text-plum outline-none placeholder:text-muted/60 focus:border-primary dark:bg-white/10 dark:text-plum-dark dark:placeholder:text-muted-dark/60'

function ScheduleEditor() {
  const schedule = useSchedule()
  const save = useSaveSchedule()
  const [doses, setDoses] = useState<DoseIn[]>([{ time: '07:00', label: 'Desayuno' }])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (schedule.data) {
      setDoses(
        schedule.data.doses.filter((d) => d.is_active).map((d) => ({ time: d.time.slice(0, 5), label: d.label })),
      )
    }
  }, [schedule.data])

  if (schedule.isPending) {
    return <div className="h-40 animate-pulse rounded-[20px] bg-black/5 dark:bg-white/10" aria-label="Cargando cronograma" />
  }
  if (schedule.isError) {
    return (
      <Card>
        <Button variant="soft" onClick={() => schedule.refetch()} className="w-full">
          No se pudo cargar el cronograma. Toca para reintentar.
        </Button>
      </Card>
    )
  }

  return (
    <Card label="Cronograma de dosis">
      <h2 className="flex items-center gap-2 text-[17px]">
        <Clock aria-hidden="true" size={18} className="text-primary dark:text-primary-dark" />
        Horarios de mis dosis
      </h2>
      <p className="text-[13px] text-muted dark:text-muted-dark">De 1 a 6 dosis al día, según tu tratamiento.</p>
      <ul className="mt-3 space-y-2">
        {doses.map((dose, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="time"
              aria-label={`Hora de la dosis ${i + 1}`}
              value={dose.time}
              onChange={(e) => setDoses((ds) => ds.map((d, j) => (j === i ? { ...d, time: e.target.value } : d)))}
              className={`${inputSm} w-32`}
            />
            <input
              aria-label={`Nombre de la dosis ${i + 1}`}
              value={dose.label ?? ''}
              placeholder="Ej. Antes del almuerzo"
              onChange={(e) => setDoses((ds) => ds.map((d, j) => (j === i ? { ...d, label: e.target.value } : d)))}
              className={`${inputSm} min-w-0 flex-1`}
            />
            {doses.length > 1 && (
              <button
                type="button"
                aria-label={`Quitar dosis ${i + 1}`}
                onClick={() => setDoses((ds) => ds.filter((_, j) => j !== i))}
                className="pressable focus-ring touch-target w-11 shrink-0 rounded-2xl bg-mz-red-soft text-mz-red"
              >
                <Trash2 aria-hidden="true" size={18} className="mx-auto" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {doses.length < 6 && (
        <Button variant="soft" onClick={() => setDoses((ds) => [...ds, { time: '12:00', label: '' }])} className="mt-2 w-full">
          <span className="inline-flex items-center gap-1.5">
            <Plus aria-hidden="true" size={18} />
            Agregar dosis
          </span>
        </Button>
      )}
      <FieldError message={error ?? undefined} />
      <Button
        disabled={save.isPending}
        onClick={() => {
          setError(null)
          const clean = doses.filter((d) => d.time).map((d) => ({ time: d.time, label: d.label?.trim() ? d.label.trim() : null }))
          save.mutate(clean, {
            onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo guardar.'),
          })
        }}
        className="mt-3 w-full"
      >
        {save.isPending ? 'Guardando…' : 'Guardar horarios'}
      </Button>
    </Card>
  )
}

function UpcomingCard({ reminder }: { reminder: ReminderOut }) {
  const snooze = useSnoozeReminder()
  const confirm = useConfirmReminder()
  const register = useRegisterInjection()
  const [suggested, setSuggested] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const past = new Date(reminder.due_at).getTime() <= Date.now()
  const pending = reminder.status === 'SENT' || past

  return (
    <li className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[17px] font-bold">{formatDue(reminder.due_at)}</p>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${
            pending
              ? 'bg-mz-yellow-soft text-mz-yellow dark:bg-white/10 dark:text-[#f2d478]'
              : 'bg-primary-soft text-primary-ink dark:bg-white/10 dark:text-primary-dark'
          }`}
        >
          <Clock aria-hidden="true" size={13} strokeWidth={2.5} />
          {pending ? 'Pendiente' : 'Programada'}
        </span>
      </div>
      {suggested ? (
        <Button
          disabled={register.isPending}
          onClick={() =>
            register.mutate(
              { microzone_id: suggested, confirm_not_recovered: false, origin: 'REMINDER' },
              { onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo registrar.') },
            )
          }
          className="mt-3 w-full"
        >
          {register.isPending ? 'Registrando…' : `Registrar en ${suggested}`}
        </Button>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[15, 30, 60].map((min) => (
            <button
              key={min}
              type="button"
              disabled={snooze.isPending}
              onClick={() =>
                snooze.mutate(
                  { id: reminder.id, minutes: min },
                  { onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo posponer.') },
                )
              }
              className="pressable focus-ring touch-target rounded-2xl bg-primary-soft text-[14px] font-bold text-primary-ink disabled:opacity-60 dark:bg-white/10 dark:text-primary-dark"
            >
              +{min}′
            </button>
          ))}
          <button
            type="button"
            disabled={confirm.isPending}
            onClick={() =>
              confirm.mutate(reminder.id, {
                onSuccess: (res) => setSuggested(res.suggested_microzone_id),
                onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo confirmar.'),
              })
            }
            className="pressable focus-ring touch-target inline-flex items-center justify-center gap-1 rounded-2xl bg-mz-green-soft text-[14px] font-extrabold text-mz-green disabled:opacity-60 dark:bg-white/10 dark:text-[#8fe0bd]"
          >
            <Check aria-hidden="true" size={16} strokeWidth={3} />
            {confirm.isPending ? '…' : 'La apliqué'}
          </button>
        </div>
      )}
      <FieldError message={error ?? undefined} />
    </li>
  )
}

const PUSH_LABEL: Record<string, { text: string; Icon: typeof BellRing }> = {
  idle: { text: 'Activar notificaciones push', Icon: BellRing },
  working: { text: 'Activando…', Icon: BellRing },
  subscribed: { text: 'Notificaciones activadas en este dispositivo', Icon: Check },
  denied: { text: 'Permiso denegado: actívalo en el navegador', Icon: BellOff },
  unsupported: { text: 'Este navegador no soporta push', Icon: BellOff },
}

export default function Reminders() {
  const upcoming = useUpcoming()
  const [pushState, setPushState] = useState<'idle' | 'working' | 'subscribed' | 'denied' | 'unsupported'>('idle')
  const push = PUSH_LABEL[pushState]

  return (
    <div className="space-y-3 px-4 pb-32 pt-3 lg:px-8 lg:pb-10">
      <ScheduleEditor />

      <section aria-label="Próximas dosis">
        <h2 className="px-1 text-[17px]">Próximas dosis</h2>
        {upcoming.isPending && (
          <div className="mt-2 h-24 animate-pulse rounded-[20px] bg-black/5 dark:bg-white/10" aria-label="Cargando recordatorios" />
        )}
        {upcoming.isError && (
          <Card>
            <Button variant="soft" onClick={() => upcoming.refetch()} className="w-full">
              No se pudieron cargar. Toca para reintentar.
            </Button>
          </Card>
        )}
        {upcoming.data && upcoming.data.length === 0 && (
          <Card>
            <p className="text-[14px] text-muted dark:text-muted-dark">
              Sin dosis próximas. Guarda tus horarios arriba y aparecerán aquí.
            </p>
          </Card>
        )}
        {upcoming.data && upcoming.data.length > 0 && (
          <ul className="mt-2 space-y-2">
            {upcoming.data.map((r) => (
              <UpcomingCard key={r.id} reminder={r} />
            ))}
          </ul>
        )}
      </section>

      <Card>
        <Button
          variant="soft"
          disabled={pushState === 'working' || pushState === 'subscribed'}
          onClick={() => {
            setPushState('working')
            void ensurePushSubscription().then(setPushState)
          }}
          className="w-full"
        >
          <span className="inline-flex items-center gap-2">
            <push.Icon aria-hidden="true" size={18} />
            {push.text}
          </span>
        </Button>
      </Card>
      <p className="px-1 text-[12px] text-muted dark:text-muted-dark">
        En iPhone el push solo llega con la app instalada (iOS 16.4+). Esta lista es el respaldo dentro de la app.
      </p>
    </div>
  )
}
