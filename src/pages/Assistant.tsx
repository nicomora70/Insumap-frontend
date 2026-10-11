import { useEffect, useRef, useState } from 'react'
import { SendHorizontal, TriangleAlert } from 'lucide-react'
import { ApiError } from '../lib/api'
import { useAssistantMessages, useSendAssistantMessage } from '../lib/assistant'
import { Button, Card, FieldError } from '../components/ui'

const QUICK = ['¿Dónde me inyecto ahora?', '¿Por qué esa zona?', '¿Cómo voy esta semana?']

export default function Assistant() {
  const messages = useAssistantMessages()
  const send = useSendAssistantMessage()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [degraded, setDegraded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const items = messages.data ?? []
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [items.length])

  function submit(message: string) {
    const clean = message.trim().slice(0, 500)
    if (!clean || send.isPending) return
    setError(null)
    setText('')
    send.mutate(clean, {
      onSuccess: (res) => setDegraded(res.degraded),
      onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo enviar. Revisa tu conexión.'),
    })
  }

  return (
    <div className="flex min-h-[70svh] flex-col px-4 pb-32 pt-3 lg:px-8 lg:pb-10">
      {degraded && (
        <p className="mb-2 flex items-start gap-2 rounded-2xl bg-mz-yellow-soft px-4 py-2 text-[13px] font-bold text-mz-yellow dark:bg-white/10 dark:text-[#f2d478]">
          <TriangleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          Asistente con respuesta básica (sin IA por ahora). La sugerencia sigue siendo la del algoritmo.
        </p>
      )}

      {messages.isPending && (
        <div className="space-y-2" aria-label="Cargando conversación">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-[20px] bg-black/5 dark:bg-white/10" />
          ))}
        </div>
      )}
      {messages.isError && (
        <Card>
          <Button variant="soft" onClick={() => messages.refetch()} className="w-full">
            No se pudo cargar la conversación. Toca para reintentar.
          </Button>
        </Card>
      )}

      <ul className="space-y-2" aria-live="polite">
        {items.length === 0 && !messages.isPending && (
          <li className="card p-4 text-[14px] text-muted dark:text-muted-dark">
            Pregúntame dónde aplicarte la próxima dosis o qué significan los colores. Nunca te diré dosis: eso lo
            define tu médico.
          </li>
        )}
        {items
          .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
          .map((m) => (
            <li key={m.id} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] rounded-[20px] px-4 py-2.5 text-[15px] leading-snug ${
                  m.role === 'USER'
                    ? 'rounded-br-lg bg-primary text-white'
                    : 'card rounded-bl-lg'
                }`}
              >
                {m.content}
              </p>
            </li>
          ))}
        {send.isPending && (
          <li className="flex justify-start" aria-label="El asistente está respondiendo">
            <p className="card animate-pulse rounded-bl-lg px-4 py-2.5 text-[15px]">
              Escribiendo…
            </p>
          </li>
        )}
      </ul>
      <div ref={bottomRef} />

      <FieldError message={error ?? undefined} />

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={send.isPending}
            onClick={() => submit(q)}
            className="pressable focus-ring rounded-full bg-primary-soft px-3.5 py-2 text-[13px] font-bold text-primary-ink disabled:opacity-60 dark:bg-white/10 dark:text-primary-dark"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit(text)
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Ej. ¿Dónde me toca hoy?"
          aria-label="Tu pregunta al asistente"
          className="touch-target focus-ring min-w-0 flex-1 rounded-2xl border border-transparent bg-primary-soft/70 px-4 text-[16px] outline-none placeholder:text-muted/60 focus:border-primary dark:bg-white/10 dark:placeholder:text-muted-dark/60"
        />
        <button
          type="submit"
          disabled={send.isPending || !text.trim()}
          aria-label="Enviar pregunta"
          className="pressable focus-ring touch-target w-12 shrink-0 rounded-2xl bg-primary text-white disabled:opacity-50"
        >
          <SendHorizontal aria-hidden="true" size={20} className="mx-auto" />
        </button>
      </form>
      <p className="mt-2 px-1 text-[12px] text-muted dark:text-muted-dark">
        Insumap es un proyecto académico de apoyo a la rotación; no es un dispositivo médico.
      </p>
    </div>
  )
}
