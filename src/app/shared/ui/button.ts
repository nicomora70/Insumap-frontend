import { Component, computed, input } from '@angular/core';

export type BtnVariant = 'primary' | 'dark' | 'outline' | 'soft' | 'ghost' | 'danger';

const BASE =
  'pressable focus-ring touch-target inline-flex cursor-pointer items-center justify-center gap-2 ' +
  'rounded-full text-[15px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-honey text-ink-strong hover:bg-honey-deep',
  dark: 'bg-primary text-white hover:bg-primary-strong',
  outline: 'border border-line bg-card text-ink hover:bg-sand',
  soft: 'bg-sand text-ink hover:bg-sand-deep',
  ghost: 'text-ink hover:bg-sand',
  danger: 'bg-mz-red-soft text-mz-red hover:bg-mz-red-soft/70',
};

/**
 * Botón/enlace con las variantes del sistema (píldora).
 * Uso: `<button uiBtn variant="soft" [extraClass]="'w-full'">…</button>`
 * Icono solo: `<button uiBtn [icon]="true" aria-label="…"><svg …/></button>`
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
    const size = this.icon() ? 'h-11 w-11 p-0' : 'px-5';
    return `${BASE} ${size} ${VARIANTS[this.variant()]} ${this.extraClass()}`;
  });
}
