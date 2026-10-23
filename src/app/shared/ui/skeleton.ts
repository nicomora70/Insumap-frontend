import { Component } from '@angular/core';

/** Bloque de carga. Misma forma que el contenido real: úsalo con h-* y w-*. */
@Component({
  selector: 'ui-skeleton',
  template: '',
  host: {
    class: 'block animate-pulse rounded-3xl bg-sand',
    'aria-hidden': 'true',
  },
})
export class UiSkeleton {}
