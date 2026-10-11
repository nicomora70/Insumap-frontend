import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import type { CellOut } from '../lib/injections'

/* Primitivas pastel del sistema nuevo. Textos en español (usuario final). */

type ButtonVariant = 'primary' | 'soft' | 'white' | 'danger-soft' | 'ghost'

const BUTTON_STYLE: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-strong',
  soft: 'bg-primary-soft text-primary-ink dark:bg-white/10 dark:text-primary-dark',
  white: 'bg-white text-primary-ink hover:bg-primary-soft dark:bg-white/10 dark:text-primary-dark',
  'danger-soft': 'bg-mz-red-soft text-mz-red dark:bg-white/10 dark:text-[#ff9d94]',
  ghost: 'text-primary hover:bg-primary-soft/60 dark:text-primary-dark dark:hover:bg-white/10',
}

export function Button({ variant = 'primary', className = '', ...props }: {
  variant?: ButtonVariant
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`pressable focus-ring touch-target rounded-2xl px-4 text-[16px] font-extrabold disabled:opacity-60 ${BUTTON_STYLE[variant]} ${className}`}
    />
  )
}

export function Card({ className = '', children, label }: {
  className?: string
  children: ReactNode
  label?: string
}) {
  return (
    <section aria-label={label} className={`card p-4 sm:p-5 ${className}`}>
      {children}
    </section>
  )
}

/** Tile pastel con icono (chips de categorías del estilo de la referencia). */
export function Tile({ tone, Icon, label, onClick }: {
  tone: 'sky' | 'mint' | 'lemon' | 'peach'
  Icon: typeof Check
  label: string
  onClick?: () => void
}) {
  const tones = {
    sky: 'bg-sky text-sky-ink dark:bg-white/10 dark:text-[#a8c8f0]',
    mint: 'bg-mint text-mint-ink dark:bg-white/10 dark:text-[#8fe0bd]',
    lemon: 'bg-lemon text-lemon-ink dark:bg-white/10 dark:text-[#f2d478]',
    peach: 'bg-peach text-peach-ink dark:bg-white/10 dark:text-[#f0b58a]',
  } as const
  const base = `flex flex-col items-center justify-center gap-1.5 rounded-[22px] px-2 py-3 text-[13px] font-extrabold ${tones[tone]}`
  if (!onClick) {
    return (
      <div className={base}>
        <Icon aria-hidden="true" size={24} strokeWidth={2.2} />
        {label}
      </div>
    )
  }
  return (
    <button type="button" onClick={onClick} className={`${base} pressable focus-ring touch-target`}>
      <Icon aria-hidden="true" size={24} strokeWidth={2.2} />
      {label}
    </button>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-[14px] font-bold text-mz-red">
      {message}
    </p>
  )
}

export const inputClass =
  'focus-ring touch-target w-full rounded-2xl border border-transparent bg-primary-soft/80 px-4 text-[16px] text-plum outline-none transition-colors placeholder:text-muted/60 focus:border-primary/60 focus:bg-card dark:bg-white/10 dark:text-plum-dark dark:placeholder:text-muted-dark/60'

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[14px] font-extrabold">
      {children}
    </label>
  )
}

const STATUS_META: Record<CellOut['color'], { word: string; classes: string; Icon: typeof Check }> = {
  RED: { word: 'En recuperación', classes: 'bg-mz-red-soft text-mz-red dark:bg-white/10 dark:text-[#ff9d94]', Icon: X },
  YELLOW: { word: 'Casi lista', classes: 'bg-mz-yellow-soft text-mz-yellow dark:bg-white/10 dark:text-[#f2d478]', Icon: AlertTriangle },
  GREEN: { word: 'Disponible', classes: 'bg-mz-green-soft text-mz-green dark:bg-white/10 dark:text-[#8fe0bd]', Icon: Check },
}

/** Estado con icono + palabra, nunca solo color (RNF-05). */
export function StatusPill({ color }: { color: CellOut['color'] }) {
  const { word, classes, Icon } = STATUS_META[color]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-extrabold ${classes}`}>
      <Icon aria-hidden="true" size={14} strokeWidth={3} />
      {word}
    </span>
  )
}

/** Avatar circular con inicial sobre pastel (estilo de la lista del video). */
const AVATAR_TONES = ['bg-sky text-sky-ink', 'bg-mint text-mint-ink', 'bg-lemon text-lemon-ink', 'bg-peach text-peach-ink', 'bg-bubble text-bubble-ink']
const AVATAR_SOLID = ['bg-sky', 'bg-mint', 'bg-lemon', 'bg-peach', 'bg-bubble']

export function Avatar({ name, size = 44, tone }: { name: string; size?: number; tone?: number }) {
  const initial = (name.trim().charAt(0) || '?').toUpperCase()
  const idx = tone ?? (initial.charCodeAt(0) % AVATAR_SOLID.length)
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-black ${AVATAR_TONES[idx]}`}
    >
      {initial}
    </span>
  )
}

export function SkeletonList({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div className="space-y-2" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-[24px] bg-primary-soft/70 dark:bg-white/10" />
      ))}
    </div>
  )
}

export function ErrorState({ title, hint, onRetry }: { title: string; hint?: string; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-16 text-center">
      <p className="text-[16px] font-extrabold">{title}</p>
      {hint && <p className="mt-1 text-[14px] text-muted dark:text-muted-dark">{hint}</p>}
      <Button onClick={onRetry} className="mt-4 w-full">
        Reintentar
      </Button>
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-16 text-center">
      <p className="text-[16px] font-extrabold">{title}</p>
      {hint && <p className="mt-1 text-[14px] text-muted dark:text-muted-dark">{hint}</p>}
    </div>
  )
}

export { AVATAR_SOLID }
