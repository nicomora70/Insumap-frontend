import type { ReactNode } from 'react'
import { motion } from 'motion/react'

export type ShellTab = { id: string; label: string; icon: string }

/** Shell responsive: bottom nav < lg, sidebar fija en escritorio (regla de Pantallas). */
export function AppShell({ brand, title, tabs, active, onChange, children }: {
  brand: string
  title: string
  tabs: ShellTab[]
  active: string
  onChange: (id: string) => void
  children: ReactNode
}) {
  return (
    <div className="min-h-svh bg-[#f2f2f7] text-[#1c1c1e] lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] dark:bg-black dark:text-[#f2f2f7]">
      <aside className="hidden border-r border-black/5 bg-white/70 px-3 py-6 backdrop-blur-xl dark:border-white/10 dark:bg-black/40 lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <p className="px-3 text-[13px] font-semibold uppercase tracking-wide text-[#0a84ff]">{brand}</p>
        <nav aria-label="Navegación principal" className="mt-6 flex flex-col gap-1">
          {tabs.map((t) => {
            const on = t.id === active
            return (
              <button
                key={t.id}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => onChange(t.id)}
                className={`pressable flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-semibold ${
                  on ? 'bg-[#0a84ff]/10 text-[#0a84ff]' : 'text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10'
                }`}
              >
                <span aria-hidden="true" className="w-6 text-center text-[18px]">
                  {t.icon}
                </span>
                {t.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="relative min-w-0">
        <header className="chrome-translucent sticky top-0 z-10 border-b border-black/5 px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))] dark:border-white/10 lg:px-8">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#0a84ff] lg:hidden">{brand}</p>
          <h1 className="text-[28px] leading-tight">{title}</h1>
        </header>
        <div className="mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-6xl">{children}</div>

        <nav
          aria-label="Navegación principal"
          className="chrome-translucent fixed inset-x-0 bottom-0 z-10 border-t border-black/5 dark:border-white/10 lg:hidden"
        >
          <div
            className="mx-auto grid w-full max-w-lg px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((t) => {
              const on = t.id === active
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-current={on ? 'page' : undefined}
                  onClick={() => onChange(t.id)}
                  className={`touch-target pressable flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold ${
                    on ? 'text-[#0a84ff]' : 'text-black/40 dark:text-white/40'
                  }`}
                >
                  <motion.span
                    aria-hidden="true"
                    className="text-[20px] leading-none"
                    animate={{ scale: on ? 1.15 : 1 }}
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
    </div>
  )
}
