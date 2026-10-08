import { useEffect, useState } from 'react'
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

function formatDue(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return `Hoy ${time}`
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} ${time}`
}

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
    return <div className="h-40 animate-pulse rounded-3xl bg-black/5 dark:bg-white/10" aria-label="Cargando cronograma" />
  }
  if (schedule.isError) {
    return (
      <button
        type="button"
        onClick={() => schedule.refetch()}
        className="pressable touch-target w-full rounded-3xl bg-white p-4 font-semibold dark:bg-[#1c1c1e]"
      >
        No se pudo cargar el cronograma. Toca para reintentar.
      </button>
    )
  }

  return (
    <section
      aria-label="Cronograma de dosis"
      className="rounded-3xl bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10"
    >
      <h2 className="text-[17px]">Horarios de mis dosis</h2>
      <p className="text-[13px] text-black/50 dark:text-white/50">De 1 a 6 dosis al día, según tu tratamiento.</p>
      <ul className="mt-3 space-y-2">
        {doses.map((dose, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="time"
              aria-label={`Hora de la dosis ${i + 1}`}
              value={dose.time}
              onChange={(e) => setDoses((ds) => ds.map((d, j) => (j === i ? { ...d, time: e.target.value } : d)))}
              className="touch-target w-32 rounded-2xl border border-black/10 bg-[#f2f2f7] px-3 text-[16px] dark:border-white/10 dark:bg-black"
            />
            <input
              aria-label={`Nombre de la dosis ${i + 1}`}
              value={dose.label ?? ''}
              placeholder="Ej. Antes del almuerzo"
              onChange={(e) => setDoses((ds) => ds.map((d, j) => (j === i ? { ...d, label: e.target.value } : d)))}
              className="touch-target min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#f2f2f7] px-3 text-[16px] placeholder:text-black/30 dark:border-white/10 dark:bg-black dark:placeholder:text-white/30"
            />
            {doses.length > 1 && (
              <button
                type="button"
                aria-label={`Quitar dosis ${i + 1}`}
                onClick={() => setDoses((ds) => ds.filter((_, j) => j !== i))}
                className="pressable touch-target w-11 shrink-0 rounded-2xl bg-[#ff3b30]/10 text-[18px] text-[#ff3b30]"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      {doses.length < 6 && (
        <button
          type="button"
          onClick={() => setDoses((ds) => [...ds, { time: '12:00', label: '' }])}
          className="pressable touch-target mt-2 w-full rounded-2xl bg-black/5 font-semibold dark:bg-white/10"
        >
          + Agregar dosis
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-[#ff3b30]">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={save.isPending}
        onClick={() => {
          setError(null)
          const clean = doses.filter((d) => d.time).map((d) => ({ time: d.time, label: d.label?.trim() ? d.label.trim() : null }))
          save.mutate(clean, {
            onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo guardar.'),
          })
        }}
        className="pressable touch-target mt-3 w-full rounded-2xl bg-[#0a84ff] font-semibold text-white disabled:opacity-60"
      >
        {save.isPending ? 'Guardando…' : 'Guardar horarios'}
      </button>
    </section>
  )
}

function UpcomingCard({ reminder }: { reminder: ReminderOut }) {
  const snooze = useSnoozeReminder()
  const confirm = useConfirmReminder()
  const register = useRegisterInjection()
  const [suggested, setSuggested] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const past = new Date(reminder.due_at).getTime() <= Date.now()

  return (
    <li className="rounded-3xl bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-bold">{formatDue(reminder.due_at)}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
            reminder.status === 'SENT' || past
              ? 'bg-[#ff9f0a]/15 text-[#b26a00] dark:text-[#ffd60a]'
              : 'bg-[#0a84ff]/10 text-[#0a84ff]'
          }`}
        >
          {reminder.status === 'SENT' || past ? 'Pendiente' : 'Programada'}
        </span>
      </div>
      {suggested ? (
        <button
          type="button"
          disabled={register.isPending}
          onClick={() =>
            register.mutate(
              { microzone_id: suggested, confirm_not_recovered: false, origin: 'REMINDER' },
              { onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo registrar.') },
            )
          }
          className="pressable touch-target mt-3 w-full rounded-2xl bg-[#0a84ff] font-semibold text-white disabled:opacity-60"
        >
          {register.isPending ? 'Registrando…' : `Registrar en ${suggested}`}
        </button>
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
              className="pressable touch-target rounded-2xl bg-black/5 text-[14px] font-semibold disabled:opacity-60 dark:bg-white/10"
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
            className="pressable touch-target rounded-2xl bg-[#34c759]/15 text-[14px] font-semibold text-[#248a3d] disabled:opacity-60 dark:text-[#30d158]"
          >
            {confirm.isPending ? '…' : 'La apliqué'}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-[#ff3b30]">
          {error}
        </p>
      )}
    </li>
  )
}

export default function Reminders() {
  const upcoming = useUpcoming()
  const [pushState, setPushState] = useState<'idle' | 'working' | 'subscribed' | 'denied' | 'unsupported'>('idle')

  return (
    <div className="space-y-3 px-4 pb-32 pt-3">
      <ScheduleEditor />

      <section aria-label="Próximas dosis">
        <h2 className="px-1 text-[17px]">Próximas dosis</h2>
        {upcoming.isPending && (
          <div className="mt-2 h-24 animate-pulse rounded-3xl bg-black/5 dark:bg-white/10" aria-label="Cargando recordatorios" />
        )}
        {upcoming.isError && (
          <button
            type="button"
            onClick={() => upcoming.refetch()}
            className="pressable touch-target mt-2 w-full rounded-3xl bg-white p-4 font-semibold dark:bg-[#1c1c1e]"
          >
            No se pudieron cargar. Toca para reintentar.
          </button>
        )}
        {upcoming.data && upcoming.data.length === 0 && (
          <p className="mt-2 rounded-3xl bg-white p-4 text-[14px] text-black/50 dark:bg-[#1c1c1e] dark:text-white/50">
            Sin dosis próximas. Guarda tus horarios arriba y aparecerán aquí.
          </p>
        )}
        {upcoming.data && upcoming.data.length > 0 && (
          <ul className="mt-2 space-y-2">
            {upcoming.data.map((r) => (
              <UpcomingCard key={r.id} reminder={r} />
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        disabled={pushState === 'working' || pushState === 'subscribed'}
        onClick={() => {
          setPushState('working')
          void ensurePushSubscription().then(setPushState)
        }}
        className="pressable touch-target w-full rounded-3xl bg-white p-4 text-[15px] font-semibold dark:bg-[#1c1c1e]"
      >
        {pushState === 'subscribed'
          ? '✓ Notificaciones activadas en este dispositivo'
          : pushState === 'working'
            ? 'Activando…'
            : pushState === 'denied'
              ? 'Permiso denegado: actívalo en el navegador'
              : pushState === 'unsupported'
                ? 'Este navegador no soporta push (ver arriba)'
                : '🔔 Activar notificaciones push'}
      </button>
      <p className="px-1 text-[12px] text-black/40 dark:text-white/40">
        En iPhone el push solo llega con la app instalada (iOS 16.4+). Esta lista es el respaldo dentro de la app.
      </p>
    </div>
  )
}
