import { Component, input } from '@angular/core';

/**
 * Estado vacío con ilustración propia (cuadrícula de microzonas con una
 * celda activa). Reemplaza los seis estados vacíos distintos que había.
 */
@Component({
  selector: 'ui-empty',
  template: `
    <div class="mx-auto flex max-w-sm flex-col items-center px-6 py-10 text-center">
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true">
        <rect x="14" y="10" width="60" height="68" rx="18" fill="var(--color-sand)" />
        <rect x="26.5" y="26" width="12" height="12" rx="3.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="40.5" y="26" width="12" height="12" rx="3.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="54.5" y="26" width="12" height="12" rx="3.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="26.5" y="40" width="12" height="12" rx="3.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="54.5" y="40" width="12" height="12" rx="3.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="26.5" y="54" width="12" height="12" rx="3.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="40.5" y="54" width="12" height="12" rx="3.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="54.5" y="54" width="12" height="12" rx="3.5" fill="var(--color-card)" stroke="var(--color-line)" />
        <rect x="40.5" y="40" width="12" height="12" rx="3.5" fill="var(--color-honey)" />
      </svg>

      <p class="mt-4 text-title text-ink-strong">{{ title() }}</p>
      <p class="mt-1.5 text-small leading-relaxed text-muted">{{ message() }}</p>

      <div class="mt-5 w-full empty:hidden">
        <ng-content />
      </div>
    </div>
  `,
})
export class UiEmpty {
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
