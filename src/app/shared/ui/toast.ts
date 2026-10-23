import { Component, inject } from '@angular/core';
import { MapStore } from '../../core/data/map.store';
import { ToastService } from '../../core/data/toast.service';
import { toApiError } from '../../core/api/api-error';
import { UiBtn } from './button';

/** Aviso flotante global con "Deshacer" (registrar/deshacer inyección). */
@Component({
  selector: 'app-toast',
  imports: [UiBtn],
  template: `
    @if (toast.toast(); as t) {
      <div
        class="fixed inset-x-0 bottom-24 z-40 mx-auto w-full max-w-lg px-4 lg:bottom-10 lg:max-w-md"
        role="status"
      >
        <div
          class="chrome-translucent shadow-float flex items-center justify-between gap-3 rounded-full border border-line px-5 py-3"
        >
          <p class="text-small font-medium text-ink">{{ t.text }}</p>
          @if (t.canUndo) {
            <button
              uiBtn
              type="button"
              [extraClass]="'shrink-0 px-4 py-2 text-caption'"
              [disabled]="map.undoPending()"
              (click)="undo()"
            >
              {{ map.undoPending() ? '…' : 'Deshacer' }}
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class ToastHost {
  protected readonly toast = inject(ToastService);
  protected readonly map = inject(MapStore);

  protected undo(): void {
    this.map.undo().subscribe({
      next: () => this.toast.hide(),
      error: (err: unknown) => this.toast.show(toApiError(err).message, false, 6_000),
    });
  }
}
