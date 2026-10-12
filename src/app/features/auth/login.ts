import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { UiBtn } from '../../shared/ui/button';
import { INPUT_CLASS } from '../../shared/ui/classes';
import { AuthShell } from './auth-shell';

/** P01: iniciar sesión (HU-20). */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, UiBtn, AuthShell],
  template: `
    <app-auth-shell
      title="Bienvenido de nuevo"
      subtitle="Accede para ver tu mapa y registrar tus dosis."
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="login-email" class="block text-[14px] font-medium text-ink">Email</label>
        <input
          id="login-email"
          type="email"
          autocomplete="email"
          placeholder="ana@correo.com"
          formControlName="email"
          [class]="input + ' mt-1.5'"
        />
        @if (emailError(); as msg) {
          <p role="alert" class="mt-1.5 text-[13px] font-medium text-mz-red">{{ msg }}</p>
        }

        <label for="login-password" class="mt-5 block text-[14px] font-medium text-ink">
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          formControlName="password"
          [class]="input + ' mt-1.5'"
        />
        @if (passwordError(); as msg) {
          <p role="alert" class="mt-1.5 text-[13px] font-medium text-mz-red">{{ msg }}</p>
        }
        @if (serverError(); as msg) {
          <p role="alert" class="mt-1.5 text-[13px] font-medium text-mz-red">{{ msg }}</p>
        }

        <button uiBtn type="submit" [extraClass]="'mt-6 w-full py-3.5'" [disabled]="submitting()">
          {{ submitting() ? 'Un momento…' : 'Entrar' }}
        </button>
        <p class="mt-4 text-center text-[14px]">
          <a
            routerLink="/forgot-password"
            class="font-medium text-ink underline underline-offset-4"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </p>
      </form>

      <div footer>
        ¿Aún no tienes cuenta?
        <a routerLink="/register" class="font-medium text-ink underline underline-offset-4">
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
}
