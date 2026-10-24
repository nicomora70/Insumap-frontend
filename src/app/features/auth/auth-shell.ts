import { Component, input } from '@angular/core';

/**
 * Marco de autenticación: panel de marca oxblood a la izquierda y formulario
 * limpio sobre crema a la derecha. En móvil se oculta el panel y queda un
 * hero compacto con el wordmark.
 */
@Component({
  selector: 'app-auth-shell',
  template: `
    <div class="relative min-h-svh overflow-x-clip bg-app-bg lg:grid lg:grid-cols-[1.05fr_1fr]">
      <!-- Panel de marca: solo escritorio -->
      <aside class="panel-ink relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-ember/20 blur-3xl"
        ></div>
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-honey/10 blur-3xl"
        ></div>

        <a
          href="/"
          aria-label="Insumap, ir al inicio"
          class="relative inline-flex w-fit items-center text-[26px] font-semibold tracking-[-0.045em] text-cream"
        >
          <span class="font-display">insumap</span><span class="text-ember" aria-hidden="true">.</span>
        </a>

        <div class="relative max-w-xl py-10">
          <p class="text-caption font-medium uppercase tracking-[0.18em] text-cream/55">
            Rotación de zonas
          </p>
          <p
            class="mt-5 max-w-2xl text-[clamp(2.75rem,4.2vw,4.5rem)] leading-[1.02] font-medium tracking-[-0.035em] text-cream"
          >
            Tu tratamiento,<br />
            sin <span class="accent accent-mark">adivinar</span>.
          </p>
          <p class="mt-6 max-w-md text-body leading-relaxed text-cream/75">
            Mira qué zonas están listas, cuáles descansan y dónde va la próxima dosis. Todo en un
            mapa que se actualiza contigo.
          </p>

          <svg
            viewBox="0 0 220 220"
            class="mt-10 h-52 w-52 xl:h-60 xl:w-60"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="1"
              y="1"
              width="218"
              height="218"
              rx="48"
              fill="rgb(248 246 242 / 0.04)"
              stroke="rgb(248 246 242 / 0.14)"
            />
            <g fill="rgb(248 246 242 / 0.13)">
              <rect x="26" y="26" width="34" height="34" rx="10" />
              <rect x="70" y="26" width="34" height="34" rx="10" />
              <rect x="114" y="26" width="34" height="34" rx="10" />
              <rect x="158" y="26" width="34" height="34" rx="10" fill="rgb(248 246 242 / 0.22)" />
              <rect x="26" y="70" width="34" height="34" rx="10" fill="rgb(248 246 242 / 0.22)" />
              <rect x="70" y="70" width="34" height="34" rx="10" />
              <rect x="114" y="70" width="34" height="34" rx="10" />
              <rect x="158" y="70" width="34" height="34" rx="10" />
              <rect x="26" y="114" width="34" height="34" rx="10" />
              <rect x="70" y="114" width="34" height="34" rx="10" fill="#ff8e3e" />
              <rect x="114" y="114" width="34" height="34" rx="10" />
              <rect x="158" y="114" width="34" height="34" rx="10" fill="rgb(248 246 242 / 0.22)" />
              <rect x="26" y="158" width="34" height="34" rx="10" />
              <rect x="70" y="158" width="34" height="34" rx="10" />
              <rect x="114" y="158" width="34" height="34" rx="10" fill="rgb(248 246 242 / 0.22)" />
              <rect x="158" y="158" width="34" height="34" rx="10" />
            </g>
          </svg>
        </div>

        <p class="relative max-w-sm text-caption leading-relaxed text-cream/55">
          Proyecto académico de apoyo a la rotación. No es un dispositivo médico.
        </p>
      </aside>

      <!-- Formulario -->
      <main class="relative flex min-h-svh flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-ember-soft blur-3xl lg:hidden"
        ></div>

        <div class="relative mx-auto w-full max-w-md">
          <p class="text-[22px] font-semibold tracking-[-0.045em] text-ink-strong lg:hidden">
            <span class="font-display">insumap</span><span class="text-ember" aria-hidden="true">.</span>
          </p>

          <h1 class="mt-8 text-h1 text-ink-strong lg:mt-0">{{ title() }}</h1>
          <p class="mt-3 text-body leading-relaxed text-muted">{{ subtitle() }}</p>

          <div class="mt-8">
            <ng-content />
          </div>

          <div class="mt-7 text-small text-muted">
            <ng-content select="[footer]" />
          </div>
        </div>
      </main>
    </div>
  `,
})
export class AuthShell {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
}
