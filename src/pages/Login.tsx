import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import { AuthFooter, AuthShell } from './AuthShell'
import { Button, FieldError, FieldLabel, inputClass } from '../components/ui'

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
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldLabel htmlFor="login-email">Email</FieldLabel>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="ana@correo.com"
          className={`${inputClass} mt-1`}
          {...register('email')}
        />
        <FieldError message={errors.email?.message} />

        <div className="mt-4">
          <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
        </div>
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

        <Button type="submit" disabled={isSubmitting} className="mt-5 w-full">
          {isSubmitting ? 'Un momento…' : 'Entrar'}
        </Button>
        <p className="mt-3 text-center text-[14px]">
          <Link to="/forgot-password" className="focus-ring font-semibold text-primary dark:text-primary-dark">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
