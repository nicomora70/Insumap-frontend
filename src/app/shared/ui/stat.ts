import { Component, input } from '@angular/core';

/** Dato protagonista: número grande en display, etiqueta pequeña. */
@Component({
  selector: 'ui-stat',
  template: `
    <div class="flex flex-col gap-1">
      <span class="index-label text-h2 leading-none text-ink-strong">
        {{ value() }}
        @if (suffix()) {
          <span class="text-body font-normal text-muted">{{ suffix() }}</span>
        }
      </span>
      <span class="text-caption font-medium tracking-[0.08em] text-muted">{{ label() }}</span>
    </div>
  `,
  host: { class: 'block' },
})
export class UiStat {
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly suffix = input<string>('');
}
