import { Component, inject, input, signal } from '@angular/core';
import { LucideFileDown } from '@lucide/angular';
import { toApiError } from '../../core/api/api-error';
import { ApiService } from '../../core/api/api.service';
import { UiBtn } from './button';
import { UiSegmented } from './segmented';
import type { SegmentOption } from './segmented';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv';

/** Barra de exporte del historial (PDF / Excel / CSV), reutilizable por rol. */
@Component({
  selector: 'app-export-card',
  imports: [UiBtn, UiSegmented, LucideFileDown],
  host: { class: '@container block' },
  template: `
    <section class="card flex flex-col gap-3 p-4 @xl:flex-row @xl:items-center">
      <div class="flex min-w-0 items-center gap-3 @xl:flex-1">
        <span
          class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ember-soft text-ember-ink"
          aria-hidden="true"
        >
          <svg lucideFileDown [size]="18" [strokeWidth]="2" aria-hidden="true"></svg>
        </span>
        <div class="min-w-0">
          <p class="text-small font-medium text-ink-strong">Exportar historial</p>
          <p class="text-caption text-muted">Elige el formato del archivo.</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="min-w-0 flex-1 @xl:w-52 @xl:flex-none">
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
          [extraClass]="'shrink-0 px-4'"
          [disabled]="busy()"
          (click)="download()"
        >
          {{ busy() ? '…' : 'Exportar' }}
        </button>
      </div>
      @if (error(); as msg) {
        <p role="alert" class="text-small font-medium text-mz-red @xl:basis-full">{{ msg }}</p>
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
