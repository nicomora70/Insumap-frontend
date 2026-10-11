import { Component, computed, input } from '@angular/core';
import { LucideCheck, LucideTriangleAlert, LucideX } from '@lucide/angular';
import type { CellColor } from '../../core/data/types';

const META: Record<CellColor, { word: string; classes: string }> = {
  RED: {
    word: 'En recuperación',
    classes: 'bg-mz-red-soft text-mz-red dark:bg-white/10 dark:text-[#ff9d94]',
  },
  YELLOW: {
    word: 'Casi lista',
    classes: 'bg-mz-yellow-soft text-mz-yellow dark:bg-white/10 dark:text-[#f2d478]',
  },
  GREEN: {
    word: 'Disponible',
    classes: 'bg-mz-green-soft text-mz-green dark:bg-white/10 dark:text-[#8fe0bd]',
  },
};

/** Estado con icono + palabra, nunca solo color (RNF-05). */
@Component({
  selector: 'ui-pill',
  imports: [LucideX, LucideTriangleAlert, LucideCheck],
  template: `
    @switch (color()) {
      @case ('RED') {
        <svg lucideX [size]="14" [strokeWidth]="3" aria-hidden="true"></svg>
      }
      @case ('YELLOW') {
        <svg lucideTriangleAlert [size]="14" [strokeWidth]="3" aria-hidden="true"></svg>
      }
      @default {
        <svg lucideCheck [size]="14" [strokeWidth]="3" aria-hidden="true"></svg>
      }
    }
    {{ word() }}
  `,
  host: { '[class]': 'cls()' },
})
export class UiPill {
  readonly color = input.required<CellColor>();

  protected readonly word = computed(() => META[this.color()].word);

  protected readonly cls = computed(
    () =>
      'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-extrabold ' +
      META[this.color()].classes,
  );
}
