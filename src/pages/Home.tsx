import { useState } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '../lib/auth'

type Tab = 'mapa' | 'historial' | 'recordatorios' | 'asistente' | 'perfil'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'mapa', label: 'Mapa', icon: '◉' },
  { id: 'historial', label: 'Historial', icon: '☰' },
  { id: 'recordatorios', label: 'Dosis', icon: '⏰' },
  { id: 'asistente', label: 'Ayuda', icon: '✦' },
  { id: 'perfil', label: 'Perfil', icon: '○' },
]

type Macro = { code: 'ABD' | 'MUS' | 'BRA' | 'GLU'; label: string; hint: string }

const MACROS: Macro[] = [
  { code: 'ABD', label: 'Abdomen', hint: 'Izq. / der. del ombligo' },
  { code: 'MUS', label: 'Muslos', hint: 'Cara frontal y lateral' },
  { code: 'BRA', label: 'Brazos', hint: 'Cara posterior' },
  { code: 'GLU', label: 'Glúteos', hint: 'Cuadrante superior externo' },
]

/** Cosa 1: shell visual. Los colores reales llegan con GET /map en la cosa 2. */
function mockCells(macro: Macro['code']): ('RED' | 'YELLOW' | 'GREEN')[] {
  const cells: ('RED' | 'YELLOW' | 'GREEN')[] = Array.from({ length: 16 }, () => 'GREEN')
  if (macro === 'ABD') {
    cells[0] = 'RED'
    cells[5] = 'RED'
    cells[6] = 'YELLOW'
  }
  if (macro === 'MUS') cells[10] = 'YELLOW'
  if (macro === 'BRA') cells[3] = 'YELLOW'
  return cells
}

const CELL_STYLE: Record<string, string> = {
  RED: 'bg-[#ff3b30]/15 text-[#ff3b30] pattern-red',
  YELLOW: 'bg-[#ffcc00]/20 text-[#8a6d00] pattern-yellow dark:text-[#ffd60a]',
  GREEN: 'bg-[#34c759]/15 text-[#248a3d] pattern-green dark:text-[#30d158]',
}

const CELL_ICON: Record<string, string> = { RED: '●', YELLOW: '◐', GREEN: '○' }

function MacroCard({ macro }: { macro: Macro }) {
  const cells = mockCells(macro.code)
  return (
    <section
      aria-label={`${macro.label}: ${macro.hint}`}
      className="rounded-3xl bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10"
    >
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-[17px]">{macro.label}</h2>
        <span className="text-[13px] text-black/50 dark:text-white/50">ABD = ejemplo 4×4</span>
      </div>
      <p className="mb-3 text-[13px] text-black/50 dark:text-white/50">{macro.hint}</p>
      <div className="grid grid-cols-2 gap-3">
        {(['I', 'D'] as const).map((side) => (
          <div key={side}>
            <p className="mb-1 text-[12px] font-semibold text-black/40 dark:text-white/40">
              {side === 'I' ? 'Izquierdo' : 'Derecho'}
            </p>
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={`${macro.label} lado ${side}`}>
              {cells.map((color, i) => {
                const row = Math.floor(i / 4) + 1
                const col = (i % 4) + 1
                const id = `${macro.code}-${side}-${row}-${col}`
                return (
                  <button
                    key={id}
                    type="button"
                    aria-label={`Microzona ${id}, ${color === 'RED' ? 'roja, en recuperación' : color === 'YELLOW' ? 'amarilla, casi lista' : 'verde, disponible'}`}
                    data-microzone={id}
                    className={`touch-target pressable flex items-center justify-center rounded-xl text-[13px] font-bold ${CELL_STYLE[color]}`}
                  >
                    <span aria-hidden="true">{CELL_ICON[color]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-16 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mt-1 text-[14px] text-black/50 dark:text-white/50">{body}</p>
    </div>
  )
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('mapa')
  const { user, logout } = useAuth()

  return (
    <div className="mx-auto min-h-svh w-full max-w-lg bg-[#f2f2f7] text-[#1c1c1e] dark:bg-black dark:text-[#f2f2f7]">
      {/* Translucent header: answers "where am I" while content scrolls under */}
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
          <div className="space-y-3 px-4 pb-32 pt-3">
            {/* Suggestion card: the common path first (apple-design simplicity) */}
            <section
              aria-label="Sugerencia para la próxima dosis"
              className="rounded-3xl bg-[#0a84ff] p-4 text-white shadow-[0_8px_24px_rgb(10_132_255/0.35)]"
            >
              <p className="text-[13px] font-semibold uppercase tracking-wide text-white/70">
                Sugerencia · vista previa
              </p>
              <p className="mt-0.5 text-[20px] font-bold leading-snug">
                Glúteo derecho, parte superior <span className="font-mono text-[15px]">(GLU-D-1-1)</span>
              </p>
              <p className="mt-1 text-[14px] text-white/80">
                El punto óptimo real lo calcula el backend (cosa 2). Toca una microzona verde para registrar.
              </p>
              <button
                type="button"
                className="pressable touch-target mt-3 w-full rounded-2xl bg-white font-semibold text-[#0a84ff]"
              >
                Registrar aquí
              </button>
            </section>

            {MACROS.map((m) => (
              <MacroCard key={m.code} macro={m} />
            ))}

            <p className="px-1 pt-1 text-[12px] leading-relaxed text-black/40 dark:text-white/40">
              Proyecto académico de apoyo a la rotación. No es un dispositivo médico.
            </p>
          </div>
        )}
        {tab === 'historial' && (
          <Placeholder title="Historial" body="Cosa 4: lista desde GET /history con paginación por cursor." />
        )}
        {tab === 'recordatorios' && (
          <Placeholder title="Mis dosis" body="Cosa 5: cronograma y próximos recordatorios." />
        )}
        {tab === 'asistente' && (
          <Placeholder title="Asistente" body="Cosa 6: explica la sugerencia en lenguaje sencillo, sin dosis." />
        )}
        {tab === 'perfil' && (
          <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-16 text-center">
            <p className="text-[20px] font-bold">{user?.name}</p>
            <p className="mt-0.5 text-[14px] text-black/50 dark:text-white/50">
              {user?.email} · {user?.role === 'DOCTOR' ? 'Médico' : 'Paciente'}
            </p>
            <p className="mt-3 text-[14px] text-black/50 dark:text-white/50">
              Cosa 3: cuadrícula 2×4×6 y vínculo con el médico.
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              className="pressable touch-target mt-5 w-full rounded-2xl bg-[#ff3b30]/10 font-semibold text-[#ff3b30]"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </motion.main>

      {/* BottomNav: 5 destinos, targets >=44px, safe-area aware */}
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
                  transition={{ type: 'spring', damping: 1.0, stiffness: 260 }}
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
