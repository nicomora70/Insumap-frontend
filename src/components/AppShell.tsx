import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { Avatar } from './ui'

export type ShellTab = { id: string; label: string; Icon: LucideIcon }

/** Shell responsive: barra inferior flotante < lg, sidebar en escritorio. */
export function AppShell({ title, greeting, userName, tabs, active, onChange, children }: {
  title: string
  greeting?: string
  userName?: string
  tabs: ShellTab[]
  active: string
  onChange: (id: string) => void
  children: ReactNode
}) {
  return (
    <div className="min-h-svh bg-app-bg text-plum lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] dark:bg-app-bg-dark dark:text-plum-dark">
      <aside className="hidden border-r border-primary-soft bg-card/70 px-4 py-6 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col dark:border-white/10 dark:bg-card-dark/60">
        <p className="flex items-center gap-2 px-2 text-[17px] font-black text-primary dark:text-primary-dark">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white dark:bg-primary-dark dark:text-primary-ink-dark">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 3c3.5 4.2 6 7.6 6 10.6a6 6 0 1 1-12 0C6 10.6 8.5 7.2 12 3Z" />
            </svg>
          </span>
          Insumap
        </p>
        <nav aria-label="Navegación principal" className="mt-5 flex flex-col gap-1">
          {tabs.map((t) => {
            const on = t.id === active
            const Icon = t.Icon
            return (
              <button
                key={t.id}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => onChange(t.id)}
                className={`pressable focus-ring flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-extrabold ${
                  on ? 'bg-primary text-white' : 'text-muted hover:bg-primary-soft/60 dark:text-muted-dark dark:hover:bg-white/10'
                }`}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={2.4} />
                {t.label}
              </button>
            )
          })}
        </nav>
        {userName && (
          <div className="mt-auto flex items-center gap-3 px-2 pt-6">
            <Avatar name={userName} size={40} />
            <p className="text-[14px] font-extrabold">{userName}</p>
          </div>
        )}
      </aside>

      <div className="relative min-w-0">
        <header className="px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))] lg:px-8 lg:pb-4 lg:pt-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {greeting && <p className="text-[15px] font-bold text-muted dark:text-muted-dark">{greeting}</p>}
              <h1 className="truncate text-[26px] leading-tight sm:text-[30px]">{title}</h1>
            </div>
            {userName && (
              <button
                type="button"
                onClick={() => onChange('perfil')}
                aria-label="Ir a mi perfil"
                className="pressable focus-ring touch-target rounded-[20px] bg-primary-soft p-2 dark:bg-white/10"
              >
                <Avatar name={userName} size={34} />
              </button>
            )}
          </div>
        </header>
        <div className="mx-auto w-full max-w-lg pb-28 md:max-w-3xl lg:max-w-6xl lg:pb-10">{children}</div>

        <nav
          aria-label="Navegación principal"
          className="fixed inset-x-3 bottom-3 z-30 lg:hidden"
        >
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-1 rounded-[26px] border border-white/70 bg-card/90 px-2 py-1.5 shadow-[0_14px_36px_rgb(84_60_140/0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-card-dark/90">
            {tabs.map((t) => {
              const on = t.id === active
              const Icon = t.Icon
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-current={on ? 'page' : undefined}
                  onClick={() => onChange(t.id)}
                  className={`pressable focus-ring touch-target flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-1.5 text-[10.5px] font-extrabold ${
                    on ? 'bg-primary text-white' : 'text-muted dark:text-muted-dark'
                  }`}
                >
                  <motion.span
                    aria-hidden="true"
                    className="leading-none"
                    animate={{ scale: on ? 1.1 : 1 }}
                    transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <Icon size={20} strokeWidth={on ? 2.6 : 2.2} />
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
