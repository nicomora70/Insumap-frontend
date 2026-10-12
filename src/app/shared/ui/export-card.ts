import { Component, inject, input, signal } from '@angular/core';
import { LucideFileDown } from '@lucide/angular';
import { toApiError } from '../../core/api/api-error';
import { ApiService } from '../../core/api/api.service';
import { UiBtn } from './button';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv';

/** Tarjeta de exporte del historial (PDF / Excel / CSV), reutilizable por rol. */
@Component({
  selector: 'app-export-card',
  imports: [UiBtn, LucideFileDown],
  template: `
    <section class="card p-5">
      <div class="flex items-center gap-3">
        <div
          class="grid flex-1 grid-cols-3 gap-1 rounded-full border border-line bg-sand p-1"
          role="group"
          aria-label="Formato de exporte"
        >
          @for (f of formats; track f) {
            <button
              type="button"
              [attr.aria-pressed]="format() === f"
              (click)="format.set(f)"
              [class]="fmtCls(f)"
            >
              {{ f }}
            </button>
          }
        </div>
        <button
          uiBtn
          type="button"
          [extraClass]="'shrink-0 py-3'"
          [disabled]="busy()"
          (click)="download()"
        >
          <svg lucideFileDown [size]="17" aria-hidden="true"></svg>
          {{ busy() ? '…' : 'Exportar' }}
        </button>
      </div>
      @if (error(); as msg) {
        <p role="alert" class="mt-2.5 text-[13px] font-medium text-mz-red">{{ msg }}</p>
      }
    </section>
  `,
})
export class ExportCard {
  readonly basePath = input.required<string>();
  readonly filename = input.required<string>();

  private readonly api = inject(ApiService);

  protected readonly formats: ExportFormat[] = ['pdf', 'xlsx', 'csv'];
  protected readonly format = signal<ExportFormat>('pdf');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected fmtCls(f: ExportFormat): string {
    const on = this.format() === f;
    return `touch-target focus-ring cursor-pointer rounded-full px-3 py-2 text-[13px] font-medium uppercase transition-colors ${
      on ? 'border border-line bg-card text-ink' : 'text-muted hover:text-ink'
    }`;
  }

  protected download(): void {
    const fmt = this.format();
    this.busy.set(true);
    this.error.set(null);
    this.api.download(`${this.basePath()}/export?format=${fmt}`).subscribe({
      next: (blob) => {
        saveBlob(blob, `${this.filename()}.${fmt}`);
        this.busy.set(false);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }
}

/** Descarga un blob en el navegador (el <a> no manda el Bearer). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
