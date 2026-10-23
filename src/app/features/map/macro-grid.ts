import { Component, computed, input, output } from '@angular/core';
import { LucideCheck, LucideTriangleAlert, LucideX } from '@lucide/angular';
import type { CellOut, ZoneOut } from '../../core/data/types';
import { CELL_STYLE, COLOR_LABEL } from '../../core/util/format';

/** Cuadrícula 2×N de una macrozona (modo Lista del mapa). */
@Component({
  selector: 'app-macro-grid',
  imports: [LucideX, LucideTriangleAlert, LucideCheck],
  template: `
    <section class="card-feature border border-line bg-card p-4 sm:p-5" [attr.aria-label]="zone().label">
      <h2 class="text-h3 text-ink-strong">{{ zone().label }}</h2>
      <div class="mt-4 grid grid-cols-2 gap-4">
        @for (s of zone().sides; track s.side) {
          <div>
            <p class="mb-2 text-caption font-medium tracking-[0.08em] text-muted">
              {{ s.side === 'I' ? 'Izquierdo' : 'Derecho' }}
            </p>
            <div
              class="grid gap-2"
              [style.grid-template-columns]="'repeat(' + cols() + ', minmax(0, 1fr))'"
              role="group"
              [attr.aria-label]="zone().label + ' lado ' + s.side"
            >
              @for (cell of s.cells; track cell.id) {
                <button
                  type="button"
                  [attr.data-microzone]="cell.id"
                  [attr.aria-label]="'Microzona ' + cell.id + ', ' + colorLabel(cell)"
                  (click)="tap.emit(cell)"
                  [class]="cellCls(cell)"
                >
                  @switch (cell.color) {
                    @case ('RED') {
                      <svg lucideX [size]="16" [strokeWidth]="2.5" aria-hidden="true"></svg>
                    }
                    @case ('YELLOW') {
                      <svg lucideTriangleAlert [size]="16" [strokeWidth]="2.5" aria-hidden="true"></svg>
                    }
                    @default {
                      <svg lucideCheck [size]="16" [strokeWidth]="2.5" aria-hidden="true"></svg>
                    }
                  }
                </button>
              }
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class MacroGrid {
  readonly zone = input.required<ZoneOut>();
  readonly gridSize = input.required<number>();

  readonly tap = output<CellOut>();

  protected readonly cols = computed(() => {
    const grid = this.gridSize();
    return grid <= 2 ? 2 : grid <= 4 ? 4 : 3;
  });

  protected cellCls(cell: CellOut): string {
    return `touch-target pressable focus-ring flex cursor-pointer items-center justify-center rounded-2xl border border-line/70 ${CELL_STYLE[cell.color]}`;
  }

  protected colorLabel(cell: CellOut): string {
    return COLOR_LABEL[cell.color];
  }
}
