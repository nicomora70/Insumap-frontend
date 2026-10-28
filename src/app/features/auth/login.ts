import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideEye, LucideEyeOff } from '@lucide/angular';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { UiBtn } from '../../shared/ui/button';
import { INPUT_CLASS } from '../../shared/ui/classes';
import { GoogleSignIn } from '../../shared/ui/google-signin';
import { AuthShell } from './auth-shell';

/** P01: iniciar sesión (HU-20). */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, UiBtn, AuthShell, GoogleSignIn, LucideEye, LucideEyeOff],
  template: `
    <app-auth-shell
      title="Bienvenido de nuevo"
      subtitle="Entra para ver tu mapa y registrar tus dosis."
    >
      <app-google-signin (credential)="googleLogin($event)" />

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="login-email" class="block text-small font-medium text-ink">Email</label>
        <input
          id="login-email"
          type="email"
          autocomplete="email"
          placeholder="ana@correo.com"
          formControlName="email"
          [class]="input + ' mt-1.5'"
        />
        @if (emailError(); as msg) {
          <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
        }

        <label for="login-password" class="mt-5 block text-small font-medium text-ink">
          Contraseña
        </label>
        <div class="relative mt-1.5">
          <input
            id="login-password"
            [type]="showPassword() ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="••••••••"
            formControlName="password"
            [class]="input + ' pr-12'"
          />
          <button
            type="button"
            (click)="showPassword.set(!showPassword())"
            [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            [attr.aria-pressed]="showPassword()"
            class="pressable focus-ring absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-sand hover:text-ink"
          >
            @if (showPassword()) {
              <svg lucideEyeOff [size]="18" [strokeWidth]="2" aria-hidden="true"></svg>
            } @else {
              <svg lucideEye [size]="18" [strokeWidth]="2" aria-hidden="true"></svg>
            }
          </button>
        </div>
        @if (passwordError(); as msg) {
          <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
        }
        @if (serverError(); as msg) {
          <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
        }

        <button uiBtn type="submit" [extraClass]="'mt-6 w-full'" [disabled]="submitting()">
          {{ submitting() ? 'Un momento…' : 'Entrar' }}
        </button>
        <p class="mt-4 text-center text-small">
          <a
            routerLink="/forgot-password"
            class="font-medium text-ink underline decoration-ember decoration-2 underline-offset-4 hover:text-ember-ink"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </p>
      </form>

      <div footer>
        ¿Aún no tienes cuenta?
        <a
          routerLink="/register"
          class="font-medium text-ink underline decoration-ember decoration-2 underline-offset-4 hover:text-ember-ink"
        >
          Crea una
        </a>
      </div>
    </app-auth-shell>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly input = INPUT_CLASS;
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected emailError(): string | null {
    const c = this.form.controls.email;
    if (!this.submitted() && !c.touched) return null;
    if (c.hasError('required')) return 'Escribe tu email.';
    if (c.hasError('email')) return 'Ese email no parece válido.';
    return null;
  }

  protected passwordError(): string | null {
    const c = this.form.controls.password;
    if (!this.submitted() && !c.touched) return null;
    if (c.hasError('required')) return 'Escribe tu contraseña.';
    return null;
  }

  protected submit(): void {
    this.serverError.set(null);
    this.submitted.set(true);
    if (this.form.invalid) return;
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim().toLowerCase(), password).subscribe({
      next: () => void this.router.navigateByUrl('/', { replaceUrl: true }),
      error: (err: unknown) => {
        this.submitting.set(false);
        this.serverError.set(toApiError(err).message);
      },
    });
  }

  protected googleLogin(credential: string): void {
    if (this.submitting()) return;
    this.serverError.set(null);
    this.submitting.set(true);
    this.auth.loginWithGoogle(credential).subscribe({
      next: () => void this.router.navigateByUrl('/', { replaceUrl: true }),
      error: (err: unknown) => {
        this.submitting.set(false);
        this.serverError.set(toApiError(err).message);
      },
    });
  }
}
