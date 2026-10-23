import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Hoja inferior en móvil y diálogo centrado en escritorio.
 * Se encarga de lo que antes faltaba: Escape, foco inicial y atrapado,
 * bloqueo del scroll de fondo, altura máxima con scroll propio y
 * restauración del foco al cerrar.
 */
@Component({
  selector: 'ui-sheet',
  template: `
    <div
      class="fade-enter fixed inset-0 z-40 bg-ink/30"
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
        class="sheet-enter pointer-events-auto flex max-h-[88svh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-line bg-card pt-3 shadow-float outline-none lg:max-h-[85vh] lg:rounded-3xl lg:border"
      >
        <div class="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-sand-deep lg:hidden" aria-hidden="true"></div>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
