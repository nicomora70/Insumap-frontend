import { Component, input } from '@angular/core';

/** Marco de autenticación: crema, wordmark en minúsculas y tarjeta con hairline. */
@Component({
  selector: 'app-auth-shell',
  template: `
    <div class="relative min-h-svh bg-app-bg">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-br from-honey-soft via-app-bg to-app-bg"
      ></div>

      <div class="relative mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-12">
        <p class="text-[22px] font-bold lowercase tracking-tight text-ink-strong">insumap</p>

        <h1 class="mt-7 text-h1 font-normal text-ink-strong">
          {{ title() }}
        </h1>
        <p class="mt-2 text-body leading-relaxed text-muted">{{ subtitle() }}</p>

        <div class="card mt-6 p-6">
          <ng-content />
        </div>
        <div class="mt-5 text-center text-small text-muted">
          <ng-content select="[footer]" />
        </div>
      </div>
    </div>
  `,
})
export class AuthShell {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
}
