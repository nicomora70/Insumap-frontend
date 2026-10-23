import { Component, computed, input, output, signal } from '@angular/core';
import { LucideArrowLeft, LucideCheck, LucideTriangleAlert, LucideX } from '@lucide/angular';
import type { CellOut, MacroSide, MapResponse } from '../../core/data/types';
import { MACRO_LABEL, macroSideCells } from '../../core/util/body';
import type { MacroCode } from '../../core/util/body';
import { CELL_STYLE, COLOR_LABEL } from '../../core/util/format';
import { UiBtn } from '../../shared/ui/button';
import { UiSegmented } from '../../shared/ui/segmented';
import type { SegmentOption } from '../../shared/ui/segmented';

/** Zoom a la cuadrícula de una macrozona con selector de lado (izq./der.). */
@Component({
  selector: 'app-zoom-grid',
  imports: [UiBtn, UiSegmented, LucideArrowLeft, LucideX, LucideTriangleAlert, LucideCheck],
  template: `
    <div class="px-5 pb-5 pt-2">
      <div class="flex items-center gap-3">
        <button
          uiBtn
          variant="outline"
          [icon]="true"
          type="button"
          [extraClass]="'shrink-0'"
          (click)="back.emit()"
          aria-label="Volver al cuerpo"
        >
          <svg lucideArrowLeft [size]="20" aria-hidden="true"></svg>
        </button>
        <h2 class="text-h3 text-ink-strong">{{ macroLabel() }}</h2>
        <div class="ml-auto w-40">
          <ui-segmented
            [options]="sideOptions"
            [value]="currentSide()"
            label="Lado"
            (changed)="setSide($event)"
          />
        </div>
      </div>

      <div
        class="mt-4 grid gap-2"
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
                <svg lucideX [size]="20" [strokeWidth]="2.5" aria-hidden="true"></svg>
              }
              @case ('YELLOW') {
                <svg lucideTriangleAlert [size]="20" [strokeWidth]="2.5" aria-hidden="true"></svg>
              }
              @default {
                <svg lucideCheck [size]="20" [strokeWidth]="2.5" aria-hidden="true"></svg>
              }
            }
          </button>
        }
      </div>
      <p class="mt-3 text-caption text-muted">
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

  protected readonly sideOptions: SegmentOption[] = [
    { id: 'I', label: 'Izq.' },
    { id: 'D', label: 'Der.' },
  ];
  protected readonly side = signal<MacroSide | null>(null);

  protected readonly currentSide = computed<MacroSide>(() => this.side() ?? this.initialSide());
  protected readonly macroLabel = computed(() => MACRO_LABEL[this.macro()]);
  protected readonly cols = computed(() => {
    const grid = this.map().grid_size;
    return grid <= 2 ? 2 : grid <= 4 ? 4 : 3;
  });
  protected readonly cells = computed(() => macroSideCells(this.map(), this.macro(), this.currentSide()));

  protected setSide(id: string): void {
    this.side.set(id === 'D' ? 'D' : 'I');
  }

  protected cellCls(cell: CellOut): string {
    const highlight = this.highlightId() === cell.id ? 'ring-2 ring-ink ring-offset-1' : '';
    return `touch-target pressable focus-ring flex aspect-square cursor-pointer items-center justify-center rounded-2xl border border-line ${CELL_STYLE[cell.color]} ${highlight}`;
  }

  protected ariaFor(cell: CellOut): string {
    return `Microzona ${cell.id}, ${COLOR_LABEL[cell.color]}`;
  }
}
