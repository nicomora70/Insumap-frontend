import { Component, computed, input } from '@angular/core';

const TONES = [
  'bg-sand text-ink',
  'bg-clay-soft text-clay',
  'bg-honey-soft text-olive',
  'bg-olive-soft text-olive',
  'bg-sand-deep text-ink',
];

/** Avatar circular con la inicial sobre tonos tierra (estilo hims). */
@Component({
  selector: 'ui-avatar',
  template: '{{ initial() }}',
  host: {
    '[class]': 'cls()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.4',
    'aria-hidden': 'true',
  },
})
export class UiAvatar {
  readonly name = input<string>('?');
  readonly size = input<number>(44);
  readonly tone = input<number | null>(null);

  protected readonly initial = computed(() => {
    const name = (this.name() ?? '').trim();
    return (name.charAt(0) || '?').toUpperCase();
  });

  protected readonly cls = computed(() => {
    const idx = this.tone() ?? this.initial().charCodeAt(0) % TONES.length;
    return `flex shrink-0 items-center justify-center rounded-full font-medium ${TONES[idx]}`;
  });
}
