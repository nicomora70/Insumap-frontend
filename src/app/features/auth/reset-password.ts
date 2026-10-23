import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { UiBtn } from '../../shared/ui/button';
import { INPUT_CLASS } from '../../shared/ui/classes';
import { AuthShell } from './auth-shell';

/** P03: nueva contraseña con el token del email (HU-22). */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, UiBtn, AuthShell],
  template: `
    <app-auth-shell
      title="Elige una contraseña nueva"
      subtitle="Con 8+ caracteres y al menos un número."
    >
      @if (!token) {
        <p role="alert" class="rounded-2xl bg-mz-red-soft px-4 py-3.5 text-small font-medium text-mz-red">
          Este enlace no trae token. Pide uno nuevo desde “Olvidé mi contraseña”.
        </p>
      } @else if (done()) {
        <p
          role="status"
          class="rounded-2xl bg-mz-green-soft px-4 py-3.5 text-small font-medium text-mz-green"
        >
          Contraseña actualizada. Ya puedes entrar.
        </p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label for="reset-password" class="block text-small font-medium text-ink">
            Contraseña nueva
          </label>
          <input
            id="reset-password"
            type="password"
            autocomplete="new-password"
            placeholder="8+ caracteres y un número"
            formControlName="password"
            [class]="input + ' mt-1.5'"
          />
          @if (passwordError(); as msg) {
            <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
          }
          @if (serverError(); as msg) {
            <p role="alert" class="mt-1.5 text-small font-medium text-mz-red">{{ msg }}</p>
          }
          <button uiBtn type="submit" [extraClass]="'mt-6 w-full'" [disabled]="submitting()">
            {{ submitting() ? 'Guardando…' : 'Guardar contraseña' }}
          </button>
        </form>
      }

      <div footer>
        ¿Lista?
        <a
          routerLink="/login"
          class="font-medium text-ink underline decoration-ember decoration-2 underline-offset-4 hover:text-ember-ink"
        >
          Entra con tu contraseña nueva
        </a>
      </div>
    </app-auth-shell>
  `,
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly input = INPUT_CLASS;
  protected readonly done = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  protected readonly form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/[0-9]/)]],
  });

  protected passwordError(): string | null {
    const c = this.form.controls.password;
    if (!this.submitted() && !c.touched) return null;
    if (c.hasError('required') || c.hasError('minlength')) return 'Mínimo 8 caracteres.';
    if (c.hasError('pattern')) return 'Incluye al menos un número.';
    return null;
  }

  protected submit(): void {
    this.serverError.set(null);
    this.submitted.set(true);
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.serverError.set(toApiError(err).message);
      },
    });
  }
}
