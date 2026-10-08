import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function AuthShell({ title, subtitle, children, footer }: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col bg-[#f2f2f7] px-5 pb-10 pt-[max(3rem,env(safe-area-inset-top))] dark:bg-black">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#0a84ff]">Insumap</p>
      <h1 className="mt-1 text-[28px] leading-tight text-[#1c1c1e] dark:text-white">{title}</h1>
      <p className="mt-1 text-[15px] text-black/50 dark:text-white/50">{subtitle}</p>
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgb(0_0_0/0.08)] dark:bg-[#1c1c1e] dark:shadow-none dark:ring-1 dark:ring-white/10">
        {children}
      </div>
      <div className="mt-4 text-center text-[14px] text-black/50 dark:text-white/50">{footer}</div>
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 text-[13px] text-[#ff3b30]">
      {message}
    </p>
  )
}

export const inputClass =
  'touch-target w-full rounded-2xl border border-black/10 bg-[#f2f2f7] px-4 text-[16px] text-[#1c1c1e] outline-none transition-colors placeholder:text-black/30 focus:border-[#0a84ff] dark:border-white/10 dark:bg-black dark:text-white dark:placeholder:text-white/30'

export function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="pressable touch-target mt-5 w-full rounded-2xl bg-[#0a84ff] text-[17px] font-semibold text-white disabled:opacity-50"
    >
      {pending ? 'Un momento…' : label}
    </button>
  )
}

export function AuthFooter({ to, cta, linkLabel }: { to: string; cta: string; linkLabel: string }) {
  return (
    <>
      {cta}{' '}
      <Link to={to} className="font-semibold text-[#0a84ff]">
        {linkLabel}
      </Link>
    </>
  )
}
