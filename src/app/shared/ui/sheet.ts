import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LucideX } from '@lucide/angular';

/**
 * Hoja inferior en móvil y diálogo centrado en escritorio.
 * Se encarga de lo que antes faltaba: Escape, foco inicial y atrapado,
 * bloqueo del scroll de fondo, altura máxima con scroll propio,
 * cierre explícito y restauración del foco al cerrar.
 */
@Component({
  selector: 'ui-sheet',
  imports: [LucideX],
  template: `
    <div
      class="fade-enter fixed inset-0 z-40 bg-oxblood-deep/40 backdrop-blur-[2px]"
      (click)="closed.emit()"
      aria-hidden="true"
    ></div>

    <div class="pointer-events-none fixed inset-0 z-40 flex items-end justify-center lg:items-center lg:p-6">
      <div
        #panel
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="label()"
        tabindex="-1"
        class="sheet-enter pointer-events-auto flex max-h-[88svh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border-t border-line bg-card pt-2 shadow-float outline-none lg:max-h-[85vh] lg:rounded-[2rem] lg:border"
      >
        <div class="grid grid-cols-[1fr_auto_1fr] items-center px-4 pb-2">
          <span aria-hidden="true"></span>
          <div class="mx-auto h-1 w-10 rounded-full bg-sand-deep lg:hidden" aria-hidden="true"></div>
          <button
            type="button"
            (click)="closed.emit()"
            aria-label="Cerrar"
            class="pressable focus-ring col-start-3 ml-auto grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-sand text-ink transition-colors hover:bg-sand-deep"
          >
            <svg lucideX [size]="18" [strokeWidth]="2.2" aria-hidden="true"></svg>
          </button>
        </div>
        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1"
        >
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class UiSheet implements OnDestroy {
  readonly label = input.required<string>();

  readonly closed = output<void>();

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private previousFocus: HTMLElement | null = null;

  constructor() {
    afterNextRender(() => {
      this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.panel().nativeElement.focus({ preventScroll: true });
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', this.onKeydown);
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.onKeydown);
    document.body.style.overflow = '';
    this.previousFocus?.focus({ preventScroll: true });
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }
    if (event.key !== 'Tab') return;

    const panel = this.panel().nativeElement;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };
}
