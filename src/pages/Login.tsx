import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import { AuthFooter, AuthShell, FieldError, SubmitButton, inputClass } from './AuthShell'

const schema = z.object({
  email: z.string().min(1, 'Escribe tu email.').email('Ese email no parece válido.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

type Form = z.infer<typeof schema>

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: 'onTouched' })

  async function onSubmit(values: Form) {
    setServerError(null)
    try {
      await login(values.email.trim().toLowerCase(), values.password)
      navigate('/', { replace: true })
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : 'No pudimos iniciar sesión. Revisa tu conexión.',
      )
    }
  }

  return (
    <AuthShell
      title="Hola de nuevo"
      subtitle="Accede para ver tu mapa y registrar tus dosis."
      footer={<AuthFooter to="/register" cta="¿Aún no tienes cuenta?" linkLabel="Crea una" />}
    >
      <form onSubmit={void handleSubmit(onSubmit)} noValidate>
        <label className="block text-[14px] font-semibold" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="ana@correo.com"
          className={`${inputClass} mt-1`}
          {...register('email')}
        />
        <FieldError message={errors.email?.message} />

        <label className="mt-4 block text-[14px] font-semibold" htmlFor="login-password">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={`${inputClass} mt-1`}
          {...register('password')}
        />
        <FieldError message={errors.password?.message} />
        <FieldError message={serverError ?? undefined} />

        <SubmitButton pending={isSubmitting} label="Entrar" />
      </form>
    </AuthShell>
  )
}
