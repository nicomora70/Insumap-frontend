import { Component, input } from '@angular/core';

/** Marco de autenticación pastel: fondo lavanda con burbujas y tarjeta suave. */
@Component({
  selector: 'app-auth-shell',
  template: `
    <div class="relative min-h-svh overflow-hidden bg-app-bg dark:bg-app-bg-dark">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-soft blur-2xl dark:bg-white/5"
      ></div>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute -right-20 top-40 h-60 w-60 rounded-full bg-pink blur-2xl dark:bg-white/5"
      ></div>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-mint blur-2xl dark:bg-white/5"
      ></div>

      <div class="relative mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-5 py-10">
        <div class="mb-5 flex items-center gap-2.5">
          <span
            class="flex h-12 w-12 items-center justify-center rounded-[18px] bg-primary text-white shadow-[0_10px_24px_rgb(108_79_216/0.35)] dark:bg-primary-dark dark:text-primary-ink-dark"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor">
              <path d="M12 3c3.5 4.2 6 7.6 6 10.6a6 6 0 1 1-12 0C6 10.6 8.5 7.2 12 3Z" />
            </svg>
          </span>
          <p class="text-[20px] font-black text-primary dark:text-primary-dark">Insumap</p>
        </div>

        <h1 class="text-[30px] leading-tight">{{ title() }}</h1>
        <p class="mt-1 text-[15px] font-semibold text-muted dark:text-muted-dark">{{ subtitle() }}</p>

        <div class="card mt-5 p-5">
          <ng-content />
        </div>
        <div class="mt-4 text-center text-[14px] font-semibold text-muted dark:text-muted-dark">
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
