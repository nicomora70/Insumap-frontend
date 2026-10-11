import { Component, computed, input } from '@angular/core';

const TONES = [
  'bg-sky text-sky-ink',
  'bg-mint text-mint-ink',
  'bg-lemon text-lemon-ink',
  'bg-peach text-peach-ink',
  'bg-bubble text-bubble-ink',
];

/** Avatar circular con la inicial sobre pastel (estilo de las listas de la referencia). */
@Component({
  selector: 'ui-avatar',
  template: '{{ initial() }}',
  host: {
    '[class]': 'cls()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.42',
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
    const idx =
      this.tone() ?? (this.initial().charCodeAt(0) % TONES.length);
    return `flex shrink-0 items-center justify-center rounded-full font-black ${TONES[idx]}`;
  });
}
