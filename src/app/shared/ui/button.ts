import { Component, computed, input } from '@angular/core';

export type BtnVariant = 'primary' | 'dark' | 'outline' | 'soft' | 'ghost' | 'danger' | 'glass';

const BASE =
  'pressable focus-ring touch-target inline-flex cursor-pointer items-center justify-center gap-2 ' +
  'rounded-full text-body font-medium transition-[background-color,border-color,color,box-shadow,transform] ' +
  'disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<BtnVariant, string> = {
  primary: 'btn-oxblood',
  dark: 'btn-oxblood',
  outline: 'border border-line bg-card/70 text-ink hover:border-sand-deep hover:bg-sand',
  soft: 'bg-sand text-ink hover:bg-sand-deep',
  ghost: 'text-ink hover:bg-sand',
  danger: 'bg-mz-red-soft text-mz-red hover:bg-mz-red-soft/70',
  glass: 'btn-glass',
};

/**
 * Botón/enlace con las variantes del sistema (píldora).
 * Uso: `<button uiBtn variant="soft" [extraClass]="'w-full'">…</button>`
 * Icono solo: `<button uiBtn [icon]="true" aria-label="…"><svg …/></button>`
 * Sobre panel oxblood: usa `soft` o `glass`, nunca `primary`.
 */
@Component({
  selector: 'button[uiBtn], a[uiBtn]',
  template: '<ng-content />',
  host: { '[class]': 'cls()' },
})
export class UiBtn {
  readonly variant = input<BtnVariant>('primary');
  readonly icon = input<boolean>(false);
  readonly extraClass = input<string>('');

  protected readonly cls = computed(() => {
    const size = this.icon() ? 'h-12 w-12 p-0' : 'min-h-12 px-6 py-3';
    return `${BASE} ${size} ${VARIANTS[this.variant()]} ${this.extraClass()}`;
  });
}
