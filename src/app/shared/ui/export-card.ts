import { Component, inject, input, signal } from '@angular/core';
import { LucideFileDown } from '@lucide/angular';
import { toApiError } from '../../core/api/api-error';
import { ApiService } from '../../core/api/api.service';
import { UiBtn } from './button';
import { UiSegmented } from './segmented';
import type { SegmentOption } from './segmented';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv';

/** Tarjeta de exporte del historial (PDF / Excel / CSV), reutilizable por rol. */
@Component({
  selector: 'app-export-card',
  imports: [UiBtn, UiSegmented, LucideFileDown],
  template: `
    <section class="card p-5">
      <div class="flex items-center gap-3">
        <div class="min-w-0 max-w-sm flex-1">
          <ui-segmented
            [options]="formatOptions"
            [value]="format()"
            label="Formato de exporte"
            (changed)="setFormat($event)"
          />
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
        <p role="alert" class="mt-2.5 text-small font-medium text-mz-red">{{ msg }}</p>
      }
    </section>
  `,
})
export class ExportCard {
  readonly basePath = input.required<string>();
  readonly filename = input.required<string>();

  private readonly api = inject(ApiService);

  protected readonly formatOptions: SegmentOption[] = [
    { id: 'pdf', label: 'PDF' },
    { id: 'xlsx', label: 'XLSX' },
    { id: 'csv', label: 'CSV' },
  ];
  protected readonly format = signal<ExportFormat>('pdf');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected setFormat(id: string): void {
    if (id === 'pdf' || id === 'xlsx' || id === 'csv') this.format.set(id);
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
