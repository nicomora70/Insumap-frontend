import { Component, computed, input } from '@angular/core';

export type RingTone = 'red' | 'yellow' | 'green' | 'honey' | 'ink' | 'ember';

const TONE: Record<RingTone, string> = {
  red: 'text-mz-red',
  yellow: 'text-mz-yellow',
  green: 'text-mz-green',
  honey: 'text-honey',
  ink: 'text-oxblood',
  ember: 'text-ember-ink',
};

/** Anillo de recuperación: el dato protagonista con su porcentaje. */
@Component({
  selector: 'ui-ring',
  template: `
    <div
      class="relative inline-flex items-center justify-center"
      [style.width.px]="size()"
      [style.height.px]="size()"
    >
      <svg [attr.viewBox]="'0 0 100 100'" class="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          [attr.r]="radius()"
          fill="none"
          stroke="currentColor"
          class="text-sand"
          [attr.stroke-width]="stroke()"
        />
        <circle
          cx="50"
          cy="50"
          [attr.r]="radius()"
          fill="none"
          stroke="currentColor"
          [class]="toneCls()"
          [attr.stroke-width]="stroke()"
          stroke-linecap="round"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="offset()"
        />
      </svg>
      <span class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="index-label text-h3 leading-none text-ink-strong">{{ value() }}%</span>
        @if (label()) {
          <span class="mt-1 text-caption text-muted">{{ label() }}</span>
        }
      </span>
    </div>
  `,
})
export class UiRing {
  /** Porcentaje 0–100. */
  readonly value = input.required<number>();
  readonly label = input<string>('');
  readonly size = input<number>(96);
  readonly stroke = input<number>(8);
  readonly tone = input<RingTone>('honey');

  protected readonly radius = computed(() => 50 - this.stroke() / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly offset = computed(() => {
    const pct = Math.min(100, Math.max(0, this.value()));
    return this.circumference() * (1 - pct / 100);
  });
  protected readonly toneCls = computed(
    () => `${TONE[this.tone()]} transition-[stroke-dashoffset] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]`,
  );
}
