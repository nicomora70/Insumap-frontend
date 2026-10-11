import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPassword } from '../lib/auth'
import { ApiError } from '../lib/api'
import { AuthFooter, AuthShell } from './AuthShell'
import { Button, FieldError, FieldLabel, inputClass } from '../components/ui'

const schema = z.object({
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres.')
    .regex(/[0-9]/, 'Incluye al menos un número.'),
})

type Form = z.infer<typeof schema>

/** P03: nueva contraseña con el token del email (HU-22). */
export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onTouched' })

  async function onSubmit(values: Form) {
    setServerError(null)
    try {
      await resetPassword(token, values.password)
      setDone(true)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'No pudimos cambiar tu contraseña.')
    }
  }

  return (
    <AuthShell
      title="Elige una contraseña nueva"
      subtitle="Con 8+ caracteres y al menos un número."
      footer={<AuthFooter to="/login" cta="¿Lista?" linkLabel="Entra con tu contraseña nueva" />}
    >
      {!token ? (
        <p role="alert" className="rounded-2xl bg-mz-red-soft px-4 py-3 text-[15px] font-medium text-mz-red">
          Este enlace no trae token. Pide uno nuevo desde “Olvidé mi contraseña”.
        </p>
      ) : done ? (
        <p role="status" className="rounded-2xl bg-mz-green-soft px-4 py-3 text-[15px] font-bold text-mz-green dark:bg-white/10 dark:text-[#8fe0bd]">
          Contraseña actualizada. Ya puedes entrar.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldLabel htmlFor="reset-password">Contraseña nueva</FieldLabel>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder="8+ caracteres y un número"
            className={`${inputClass} mt-1`}
            {...register('password')}
          />
          <FieldError message={errors.password?.message} />
          <FieldError message={serverError ?? undefined} />
          <Button type="submit" disabled={isSubmitting} className="mt-5 w-full">
            {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
