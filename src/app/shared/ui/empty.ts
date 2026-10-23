import { Component, input } from '@angular/core';

/**
 * Estado vacío con ilustración propia (cuadrícula de microzonas con una
 * celda activa). Reemplaza los seis estados vacíos distintos que había.
 */
@Component({
  selector: 'ui-empty',
  template: `
    <div class="mx-auto flex max-w-sm flex-col items-center px-6 py-10 text-center">
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <rect x="12" y="10" width="72" height="76" rx="24" fill="var(--color-sand)" />
        <rect x="26" y="26" width="14" height="14" rx="4.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="41" y="26" width="14" height="14" rx="4.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="56" y="26" width="14" height="14" rx="4.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="26" y="41" width="14" height="14" rx="4.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="56" y="41" width="14" height="14" rx="4.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="26" y="56" width="14" height="14" rx="4.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="41" y="56" width="14" height="14" rx="4.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="56" y="56" width="14" height="14" rx="4.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="41" y="41" width="14" height="14" rx="4.5" fill="var(--color-ember)" />
      </svg>

      <p class="mt-5 text-h3 text-ink-strong">{{ title() }}</p>
      <p class="mt-2 text-small leading-relaxed text-muted">{{ message() }}</p>

      <div class="mt-6 w-full empty:hidden">
        <ng-content />
      </div>
    </div>
  `,
})
export class UiEmpty {
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
