import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { UiBtn } from '../../shared/ui/button';
import { INPUT_CLASS } from '../../shared/ui/classes';
import { AuthShell } from './auth-shell';

/** P03: recuperar contraseña (HU-22). El backend responde igual exista o no el email. */
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, UiBtn, AuthShell],
  template: `
    <app-auth-shell
      title="Recupera tu acceso"
      subtitle="Te enviamos un enlace para crear una contraseña nueva."
    >
      @if (sent()) {
        <p
          role="status"
          class="rounded-2xl bg-mz-green-soft px-4 py-3.5 text-small font-medium text-mz-green"
        >
          Listo. Si ese email tiene cuenta, recibirás el enlace en unos minutos.
        </p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label for="forgot-email" class="block text-small font-medium text-ink">Email</label>
          <input
            id="forgot-email"
            type="email"
            autocomplete="email"
            placeholder="ana@correo.com"
            formControlName="email"
            [class]="input + ' mt-1.5'"
          />
          @if (emailError(); as msg) {
            <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
          }
          @if (serverError(); as msg) {
            <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
          }
          <button uiBtn type="submit" [extraClass]="'mt-6 w-full'" [disabled]="submitting()">
            {{ submitting() ? 'Enviando…' : 'Enviar enlace' }}
          </button>
        </form>
      }

      <div footer>
        ¿La recordaste?
        <a
          routerLink="/login"
          class="font-medium text-ink underline decoration-ember decoration-2 underline-offset-4 hover:text-ember-ink"
        >
          Vuelve a entrar
        </a>
      </div>
    </app-auth-shell>
  `,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly input = INPUT_CLASS;
  protected readonly sent = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected emailError(): string | null {
    const c = this.form.controls.email;
    if (!this.submitted() && !c.touched) return null;
    if (c.hasError('required')) return 'Escribe tu email.';
    if (c.hasError('email')) return 'Ese email no parece válido.';
    return null;
  }

  protected submit(): void {
    this.serverError.set(null);
    this.submitted.set(true);
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.auth.requestPasswordReset(this.form.getRawValue().email.trim().toLowerCase()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.serverError.set(toApiError(err).message);
      },
    });
  }
}
