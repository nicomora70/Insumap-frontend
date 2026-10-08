import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import { AuthFooter, AuthShell, FieldError, SubmitButton, inputClass } from './AuthShell'

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
      <form onSubmit={void handleSubmit(onSubmit)} noValidate>
        <label className="block text-[14px] font-semibold" htmlFor="reg-name">
          Nombre
        </label>
        <input id="reg-name" autoComplete="name" placeholder="Ana" className={`${inputClass} mt-1`} {...register('name')} />
        <FieldError message={errors.name?.message} />

        <label className="mt-4 block text-[14px] font-semibold" htmlFor="reg-email">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="ana@correo.com"
          className={`${inputClass} mt-1`}
          {...register('email')}
        />
        <FieldError message={errors.email?.message} />

        <label className="mt-4 block text-[14px] font-semibold" htmlFor="reg-password">
          Contraseña
        </label>
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
          <legend className="text-[14px] font-semibold">Soy</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(
              [
                { value: 'PATIENT', label: 'Paciente' },
                { value: 'DOCTOR', label: 'Médico' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={`touch-target pressable flex cursor-pointer items-center justify-center rounded-2xl border text-[15px] font-semibold ${
                  role === opt.value
                    ? 'border-[#0a84ff] bg-[#0a84ff]/10 text-[#0a84ff]'
                    : 'border-black/10 text-black/60 dark:border-white/10 dark:text-white/60'
                }`}
              >
                <input type="radio" value={opt.value} className="sr-only" {...register('role')} />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        {role === 'DOCTOR' && (
          <>
            <label className="mt-4 block text-[14px] font-semibold" htmlFor="reg-license">
              Registro profesional
            </label>
            <input
              id="reg-license"
              placeholder="N.º de tarjeta profesional"
              className={`${inputClass} mt-1`}
              {...register('license_number')}
            />
            <FieldError message={errors.license_number?.message} />
          </>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-2 text-[14px]">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[#0a84ff]" {...register('accept_terms')} />
          Acepto el tratamiento de mis datos de salud según lo descrito en la app.
        </label>
        <FieldError message={errors.accept_terms?.message} />
        <FieldError message={serverError ?? undefined} />

        <SubmitButton pending={isSubmitting} label="Crear cuenta" />
      </form>
    </AuthShell>
  )
}
