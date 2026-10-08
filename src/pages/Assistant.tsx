import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../lib/api'
import { useAssistantMessages, useSendAssistantMessage } from '../lib/assistant'

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
    <div className="flex min-h-[70svh] flex-col px-4 pb-32 pt-3">
      {degraded && (
        <p className="mb-2 rounded-2xl bg-[#ff9f0a]/15 px-4 py-2 text-[13px] font-medium text-[#b26a00] dark:text-[#ffd60a]">
          Asistente con respuesta básica (sin IA por ahora). La sugerencia sigue siendo la del algoritmo.
        </p>
      )}

      {messages.isPending && (
        <div className="space-y-2" aria-label="Cargando conversación">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-3xl bg-black/5 dark:bg-white/10" />
          ))}
        </div>
      )}
      {messages.isError && (
        <button
          type="button"
          onClick={() => messages.refetch()}
          className="pressable touch-target w-full rounded-3xl bg-white p-4 font-semibold dark:bg-[#1c1c1e]"
        >
          No se pudo cargar la conversación. Toca para reintentar.
        </button>
      )}

      <ul className="space-y-2" aria-live="polite">
        {items.length === 0 && !messages.isPending && (
          <li className="rounded-3xl bg-white p-4 text-[14px] text-black/60 dark:bg-[#1c1c1e] dark:text-white/60">
            Pregúntame dónde aplicarte la próxima dosis o qué significan los colores. Nunca te diré dosis: eso lo
            define tu médico.
          </li>
        )}
        {items
          .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
          .map((m) => (
            <li key={m.id} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug ${
                  m.role === 'USER'
                    ? 'rounded-br-lg bg-[#0a84ff] text-white'
                    : 'rounded-bl-lg bg-white shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10'
                }`}
              >
                {m.content}
              </p>
            </li>
          ))}
        {send.isPending && (
          <li className="flex justify-start" aria-label="El asistente está respondiendo">
            <p className="animate-pulse rounded-3xl rounded-bl-lg bg-white px-4 py-2.5 text-[15px] dark:bg-[#1c1c1e]">
              Escribiendo…
            </p>
          </li>
        )}
      </ul>
      <div ref={bottomRef} />

      {error && (
        <p role="alert" className="mt-2 text-[13px] text-[#ff3b30]">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={send.isPending}
            onClick={() => submit(q)}
            className="pressable rounded-full bg-[#0a84ff]/10 px-3.5 py-2 text-[13px] font-semibold text-[#0a84ff] disabled:opacity-60"
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
          className="touch-target min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 text-[16px] outline-none placeholder:text-black/30 focus:border-[#0a84ff] dark:border-white/10 dark:bg-[#1c1c1e] dark:placeholder:text-white/30"
        />
        <button
          type="submit"
          disabled={send.isPending || !text.trim()}
          aria-label="Enviar pregunta"
          className="pressable touch-target w-12 shrink-0 rounded-2xl bg-[#0a84ff] text-[20px] font-bold text-white disabled:opacity-50"
        >
          ↑
        </button>
      </form>
      <p className="mt-2 px-1 text-[12px] text-black/40 dark:text-white/40">
        Insumap es un proyecto académico de apoyo a la rotación; no es un dispositivo médico.
      </p>
    </div>
  )
}
