import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { HeartPulse, Stethoscope } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import { AuthFooter, AuthShell } from './AuthShell'
import { Button, FieldError, FieldLabel, inputClass } from '../components/ui'

const schema = z
  .object({
    name: z.string().min(2, 'Escribe tu nombre.'),
    email: z.string().min(1, 'Escribe tu email.').email('Ese email no parece válido.'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres.')
      .regex(/[0-9]/, 'Incluye al menos un número.'),
    role: z.enum(['PATIENT', 'DOCTOR']),
    license_number: z.string().optional(),
    accept_terms: z.boolean().refine((v) => v === true, {
      message: 'Debes aceptar el tratamiento de tus datos de salud.',
    }),
  })
  .superRefine((values, ctx) => {
    if (values.role === 'DOCTOR' && !values.license_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['license_number'],
        message: 'Como médico, indica tu registro profesional.',
      })
    }
  })

type Form = z.infer<typeof schema>

const ROLES = [
  { value: 'PATIENT', label: 'Paciente', Icon: HeartPulse },
  { value: 'DOCTOR', label: 'Médico', Icon: Stethoscope },
] as const

export default function Register() {
  const { register: signup } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { role: 'PATIENT' },
  })
  const role = watch('role')

  async function onSubmit(values: Form) {
    setServerError(null)
    try {
      await signup({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: values.role,
        accept_terms: true,
        license_number: values.license_number?.trim() ? values.license_number.trim() : null,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : 'No pudimos crear tu cuenta. Revisa tu conexión.',
      )
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Tus datos de salud solo los ves tú y los médicos que autorices."
      footer={<AuthFooter to="/login" cta="¿Ya tienes cuenta?" linkLabel="Entra" />}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldLabel htmlFor="reg-name">Nombre</FieldLabel>
        <input id="reg-name" autoComplete="name" placeholder="Ana" className={`${inputClass} mt-1`} {...register('name')} />
        <FieldError message={errors.name?.message} />

        <div className="mt-4">
          <FieldLabel htmlFor="reg-email">Email</FieldLabel>
        </div>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="ana@correo.com"
          className={`${inputClass} mt-1`}
          {...register('email')}
        />
        <FieldError message={errors.email?.message} />

        <div className="mt-4">
          <FieldLabel htmlFor="reg-password">Contraseña</FieldLabel>
        </div>
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          placeholder="8+ caracteres y un número"
          className={`${inputClass} mt-1`}
          {...register('password')}
        />
        <FieldError message={errors.password?.message} />

        <fieldset className="mt-4">
          <legend className="text-[14px] font-bold">Soy</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {ROLES.map((opt) => {
              const Icon = opt.Icon
              const selected = role === opt.value
              return (
                <label
                  key={opt.value}
                  className={`touch-target pressable focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-2xl border text-[15px] font-bold ${
                    selected
                      ? 'border-primary bg-primary-soft text-primary-ink dark:border-primary-dark dark:bg-white/10 dark:text-primary-dark'
                      : 'border-black/10 text-muted dark:border-white/15 dark:text-muted-dark'
                  }`}
                >
                  <input type="radio" value={opt.value} className="sr-only" {...register('role')} />
                  <Icon aria-hidden="true" size={18} />
                  {opt.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        {role === 'DOCTOR' && (
          <div className="mt-4">
            <FieldLabel htmlFor="reg-license">Registro profesional</FieldLabel>
            <input
              id="reg-license"
              placeholder="N.º de tarjeta profesional"
              className={`${inputClass} mt-1`}
              {...register('license_number')}
            />
            <FieldError message={errors.license_number?.message} />
          </div>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-2 text-[14px]">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[#6b4bc4]" {...register('accept_terms')} />
          Acepto el tratamiento de mis datos de salud según lo descrito en la app.
        </label>
        <FieldError message={errors.accept_terms?.message} />
        <FieldError message={serverError ?? undefined} />

        <Button type="submit" disabled={isSubmitting} className="mt-5 w-full">
          {isSubmitting ? 'Un momento…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthShell>
  )
}
