import { Component, input } from '@angular/core';

/** Dato protagonista: número grande, etiqueta pequeña. */
@Component({
  selector: 'ui-stat',
  template: `
    <div class="flex flex-col gap-0.5">
      <span class="eyebrow">{{ label() }}</span>
      <span class="tnum text-h3 text-ink-strong">
        {{ value() }}
        @if (suffix()) {
          <span class="text-small font-normal text-muted">{{ suffix() }}</span>
        }
      </span>
    </div>
  `,
  host: { class: 'block' },
})
export class UiStat {
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly suffix = input<string>('');
}
