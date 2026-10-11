import { Component, computed, input } from '@angular/core';

export type BtnVariant = 'primary' | 'soft' | 'white' | 'danger-soft' | 'ghost' | 'pink';

const BASE =
  'pressable focus-ring touch-target inline-flex cursor-pointer items-center justify-center gap-1.5 ' +
  'rounded-2xl px-4 text-[16px] font-extrabold transition-colors disabled:pointer-events-none disabled:opacity-60';

const VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-strong',
  soft: 'bg-primary-soft text-primary-ink hover:bg-primary-soft/70 dark:bg-white/10 dark:text-primary-dark',
  white: 'bg-white text-primary-ink hover:bg-primary-soft dark:bg-white/10 dark:text-primary-dark',
  'danger-soft': 'bg-mz-red-soft text-mz-red dark:bg-white/10 dark:text-[#ff9d94]',
  ghost: 'text-primary hover:bg-primary-soft/60 dark:text-primary-dark dark:hover:bg-white/10',
  pink: 'bg-pink text-pink-ink hover:bg-pink/80',
};

/**
 * Botón/enlace con las variantes pastel del sistema.
 * Uso: `<button uiBtn variant="soft" [extraClass]="'w-full'">…</button>`
 */
@Component({
  selector: 'button[uiBtn], a[uiBtn]',
  template: '<ng-content />',
  host: { '[class]': 'cls()' },
})
export class UiBtn {
  readonly variant = input<BtnVariant>('primary');
  readonly extraClass = input<string>('');

  protected readonly cls = computed(
    () => `${BASE} ${VARIANTS[this.variant()]} ${this.extraClass()}`,
  );
}
