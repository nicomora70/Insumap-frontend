import { Component, computed, input, output, signal } from '@angular/core';
import { LucideArrowLeft, LucideCheck, LucideTriangleAlert, LucideX } from '@lucide/angular';
import type { CellOut, MacroSide, MapResponse } from '../../core/data/types';
import { MACRO_LABEL, macroSideCells } from '../../core/util/body';
import type { MacroCode } from '../../core/util/body';
import { CELL_STYLE, COLOR_LABEL } from '../../core/util/format';
import { UiBtn } from '../../shared/ui/button';

/** Zoom a la cuadrícula de una macrozona con selector de lado (izq./der.). */
@Component({
  selector: 'app-zoom-grid',
  imports: [UiBtn, LucideArrowLeft, LucideX, LucideTriangleAlert, LucideCheck],
  template: `
    <div class="px-4 pb-4 pt-1">
      <div class="flex items-center gap-2">
        <button
          uiBtn
          type="button"
          [extraClass]="'h-11 w-11 shrink-0 px-0'"
          (click)="back.emit()"
          aria-label="Volver al cuerpo"
        >
          <svg lucideArrowLeft [size]="20" aria-hidden="true"></svg>
        </button>
        <h2 class="text-[20px]">{{ macroLabel() }}</h2>
        <div
          class="ml-auto grid grid-cols-2 gap-1 rounded-2xl bg-primary-soft p-1 dark:bg-white/10"
          role="group"
          aria-label="Lado"
        >
          @for (s of sides; track s) {
            <button type="button" [attr.aria-pressed]="currentSide() === s" (click)="side.set(s)" [class]="sideCls(s)">
              {{ s === 'I' ? 'Izq.' : 'Der.' }}
            </button>
          }
        </div>
      </div>

      <div
        class="mt-3 grid gap-2"
        [style.grid-template-columns]="'repeat(' + cols() + ', minmax(0, 1fr))'"
        role="group"
        [attr.aria-label]="'Cuadrícula ' + macroLabel() + ' lado ' + currentSide()"
      >
        @for (cell of cells(); track cell.id) {
          <button
            type="button"
            [attr.data-microzone]="cell.id"
            [attr.aria-label]="ariaFor(cell)"
            (click)="select.emit(cell)"
            [class]="cellCls(cell)"
          >
            @switch (cell.color) {
              @case ('RED') {
                <svg lucideX [size]="20" [strokeWidth]="3" aria-hidden="true"></svg>
              }
              @case ('YELLOW') {
                <svg lucideTriangleAlert [size]="20" [strokeWidth]="3" aria-hidden="true"></svg>
              }
              @default {
                <svg lucideCheck [size]="20" [strokeWidth]="3" aria-hidden="true"></svg>
              }
            }
          </button>
        }
      </div>
      <p class="mt-2 text-[12px] font-semibold text-muted dark:text-muted-dark">
        Con 6×6 la cuadrícula se compacta para mantener objetivos ≥44px.
      </p>
    </div>
  `,
})
export class ZoomGrid {
  readonly map = input.required<MapResponse>();
  readonly macro = input.required<MacroCode>();
  readonly initialSide = input<MacroSide>('I');
  readonly highlightId = input<string | null>(null);

  readonly back = output<void>();
  readonly select = output<CellOut>();

  protected readonly sides: MacroSide[] = ['I', 'D'];
  protected readonly side = signal<MacroSide | null>(null);

  protected readonly currentSide = computed<MacroSide>(() => this.side() ?? this.initialSide());
  protected readonly macroLabel = computed(() => MACRO_LABEL[this.macro()]);
  protected readonly cols = computed(() => {
    const grid = this.map().grid_size;
    return grid <= 2 ? 2 : grid <= 4 ? 4 : 3;
  });
  protected readonly cells = computed(() => macroSideCells(this.map(), this.macro(), this.currentSide()));

  protected sideCls(s: MacroSide): string {
    const on = this.currentSide() === s;
    return `touch-target focus-ring cursor-pointer rounded-xl px-3 text-[14px] font-extrabold ${
      on ? 'bg-card shadow dark:bg-card-dark' : 'text-muted dark:text-muted-dark'
    }`;
  }

  protected cellCls(cell: CellOut): string {
    const highlight = this.highlightId() === cell.id ? 'ring-4 ring-primary' : '';
    return `touch-target pressable focus-ring flex aspect-square cursor-pointer items-center justify-center rounded-2xl ${CELL_STYLE[cell.color]} ${highlight}`;
  }

  protected ariaFor(cell: CellOut): string {
    return `Microzona ${cell.id}, ${COLOR_LABEL[cell.color]}`;
  }
}
