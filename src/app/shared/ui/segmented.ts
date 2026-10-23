import { Component, input, output } from '@angular/core';

export interface SegmentOption {
  id: string;
  label: string;
}

/**
 * Selector segmentado (2–4 opciones). Única implementación del patrón:
 * antes estaba repetido en mapa, médico, exportes, perfil y zoom.
 */
@Component({
  selector: 'ui-segmented',
  template: `
    <div
      class="grid gap-1 rounded-full border border-line bg-sand p-1"
      role="group"
      [attr.aria-label]="label()"
      [style.grid-template-columns]="'repeat(' + options().length + ', minmax(0, 1fr))'"
    >
      @for (option of options(); track option.id) {
        <button
          type="button"
          [attr.aria-pressed]="value() === option.id"
          [disabled]="disabled()"
          (click)="pick(option.id)"
          [class]="cls(option.id)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  host: { class: 'block' },
})
export class UiSegmented {
  readonly options = input.required<readonly SegmentOption[]>();
  readonly value = input.required<string>();
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);

  readonly changed = output<string>();

  protected cls(id: string): string {
    const on = this.value() === id;
    return `touch-target pressable focus-ring cursor-pointer rounded-full px-3 py-2 text-small font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
      on ? 'border border-line bg-card text-ink' : 'text-muted hover:text-ink'
    }`;
  }

  protected pick(id: string): void {
    if (this.disabled()) return;
    if (id !== this.value()) this.changed.emit(id);
  }
}
