import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { requestPasswordReset } from '../lib/auth'
import { ApiError } from '../lib/api'
import { AuthFooter, AuthShell } from './AuthShell'
import { Button, FieldError, FieldLabel, inputClass } from '../components/ui'

const schema = z.object({
  email: z.string().min(1, 'Escribe tu email.').email('Ese email no parece válido.'),
})

type Form = z.infer<typeof schema>

/** P03: recuperar contraseña (HU-22). El back responde igual exista o no el email. */
export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onTouched' })

  async function onSubmit(values: Form) {
    setServerError(null)
    try {
      await requestPasswordReset(values.email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'No pudimos enviar el correo. Revisa tu conexión.')
    }
  }

  return (
    <AuthShell
      title="Recupera tu acceso"
      subtitle="Te enviamos un enlace para crear una contraseña nueva."
      footer={<AuthFooter to="/login" cta="¿La recordaste?" linkLabel="Vuelve a entrar" />}
    >
      {sent ? (
        <p role="status" className="rounded-2xl bg-mz-green-soft px-4 py-3 text-[15px] font-bold text-mz-green dark:bg-white/10 dark:text-[#8fe0bd]">
          Listo. Si ese email tiene cuenta, recibirás el enlace en unos minutos.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="ana@correo.com"
            className={`${inputClass} mt-1`}
            {...register('email')}
          />
          <FieldError message={errors.email?.message} />
          <FieldError message={serverError ?? undefined} />
          <Button type="submit" disabled={isSubmitting} className="mt-5 w-full">
            {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
