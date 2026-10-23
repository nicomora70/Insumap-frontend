import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideHeartPulse, LucideStethoscope } from '@lucide/angular';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import type { RegisterRequest } from '../../core/data/types';
import { UiBtn } from '../../shared/ui/button';
import { INPUT_CLASS } from '../../shared/ui/classes';
import { AuthShell } from './auth-shell';

/** P02: crear cuenta de paciente o médico (HU-21). */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, UiBtn, AuthShell, LucideHeartPulse, LucideStethoscope],
  template: `
    <app-auth-shell
      title="Crea tu cuenta"
      subtitle="Tus datos de salud solo los ves tú y los médicos que autorices."
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="reg-name" class="block text-small font-medium text-ink">Nombre</label>
        <input id="reg-name" autocomplete="name" placeholder="Ana" formControlName="name" [class]="input + ' mt-1.5'" />
        @if (nameError(); as msg) {
          <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
        }

        <label for="reg-email" class="mt-5 block text-small font-medium text-ink">Email</label>
        <input id="reg-email" type="email" autocomplete="email" placeholder="ana@correo.com" formControlName="email" [class]="input + ' mt-1.5'" />
        @if (emailError(); as msg) {
          <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
        }

        <label for="reg-password" class="mt-5 block text-small font-medium text-ink">Contraseña</label>
        <input
          id="reg-password"
          type="password"
          autocomplete="new-password"
          placeholder="8+ caracteres y un número"
          formControlName="password"
          [class]="input + ' mt-1.5'"
        />
        @if (passwordError(); as msg) {
          <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
        }

        <fieldset class="mt-5">
          <legend class="text-small font-medium text-ink">Soy</legend>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <label [class]="roleCls('PATIENT')">
              <input type="radio" value="PATIENT" formControlName="role" class="sr-only" />
              <svg lucideHeartPulse [size]="18" aria-hidden="true"></svg>
              Paciente
            </label>
            <label [class]="roleCls('DOCTOR')">
              <input type="radio" value="DOCTOR" formControlName="role" class="sr-only" />
              <svg lucideStethoscope [size]="18" aria-hidden="true"></svg>
              Médico
            </label>
          </div>
        </fieldset>

        @if (isDoctorForm()) {
          <label for="reg-license" class="mt-5 block text-small font-medium text-ink">
            Registro profesional
          </label>
          <input
            id="reg-license"
            placeholder="N.º de tarjeta profesional"
            formControlName="license_number"
            [class]="input + ' mt-1.5'"
          />
          @if (licenseError(); as msg) {
            <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
          }
        }

        <label class="mt-5 flex cursor-pointer items-start gap-2.5 text-small text-ink">
          <input type="checkbox" formControlName="accept_terms" class="mt-0.5 h-5 w-5 accent-[#1f1a14]" />
          Acepto el tratamiento de mis datos de salud según lo descrito en la app.
        </label>
        @if (termsError(); as msg) {
          <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
        }
        @if (serverError(); as msg) {
          <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
        }

        <button uiBtn type="submit" [extraClass]="'mt-6 w-full py-3.5'" [disabled]="submitting()">
          {{ submitting() ? 'Un momento…' : 'Crear cuenta' }}
        </button>
      </form>

      <div footer>
        ¿Ya tienes cuenta?
        <a routerLink="/login" class="font-medium text-ink underline underline-offset-4">Entra</a>
      </div>
    </app-auth-shell>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly input = INPUT_CLASS;
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/[0-9]/)]],
    role: this.fb.control<'PATIENT' | 'DOCTOR'>('PATIENT'),
    license_number: [''],
    accept_terms: [false, [Validators.requiredTrue]],
  });

  protected readonly roleValue = signal<'PATIENT' | 'DOCTOR'>('PATIENT');

  constructor() {
    this.form.controls.role.valueChanges.subscribe((role) => this.roleValue.set(role));
  }

  protected roleCls(role: 'PATIENT' | 'DOCTOR'): string {
    const selected = this.roleValue() === role;
    return `touch-target pressable focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-full border text-body font-medium ${
      selected
        ? 'border-ink bg-primary text-white'
        : 'border-line bg-card text-ink hover:bg-sand'
    }`;
  }

  private touched(control: string): boolean {
    return this.submitted() || this.form.get(control)!.touched;
  }

  protected nameError(): string | null {
    const c = this.form.controls.name;
    if (!this.touched('name')) return null;
    if (c.hasError('required') || c.hasError('minlength')) return 'Escribe tu nombre.';
    return null;
  }

  protected emailError(): string | null {
    const c = this.form.controls.email;
    if (!this.touched('email')) return null;
    if (c.hasError('required')) return 'Escribe tu email.';
    if (c.hasError('email')) return 'Ese email no parece válido.';
    return null;
  }

  protected passwordError(): string | null {
    const c = this.form.controls.password;
    if (!this.touched('password')) return null;
    if (c.hasError('required') || c.hasError('minlength')) return 'Mínimo 8 caracteres.';
    if (c.hasError('pattern')) return 'Incluye al menos un número.';
    return null;
  }

  protected licenseError(): string | null {
    if (!this.isDoctorForm()) return null;
    const c = this.form.controls.license_number;
    if (!this.touched('license_number')) return null;
    if (!c.value.trim()) return 'Como médico, indica tu registro profesional.';
    return null;
  }

  protected termsError(): string | null {
    const c = this.form.controls.accept_terms;
    if (!this.touched('accept_terms')) return null;
    if (c.hasError('required')) return 'Debes aceptar el tratamiento de tus datos de salud.';
    return null;
  }

  protected isDoctorForm(): boolean {
    return this.roleValue() === 'DOCTOR';
  }

  protected submit(): void {
    this.serverError.set(null);
    this.submitted.set(true);
    const values = this.form.getRawValue();
    if (this.isDoctorForm() && !values.license_number.trim()) return;
    if (this.form.invalid) return;

    this.submitting.set(true);
    const payload: RegisterRequest = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
      role: values.role,
      accept_terms: true,
      license_number: values.license_number.trim() ? values.license_number.trim() : null,
    };
    this.auth.register(payload).subscribe({
      next: () => void this.router.navigateByUrl('/', { replaceUrl: true }),
      error: (err: unknown) => {
        this.submitting.set(false);
        this.serverError.set(toApiError(err).message);
      },
    });
  }
}
