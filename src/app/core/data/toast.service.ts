import { Injectable, signal } from '@angular/core';

export interface ToastState {
  text: string;
  canUndo: boolean;
}

/** Aviso flotante con acción de deshacer (p. ej. tras registrar una inyección). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<ToastState | null>(null);

  private timer: number | null = null;

  show(text: string, canUndo = false, ms = 10_000): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.toast.set({ text, canUndo });
    this.timer = window.setTimeout(() => this.hide(), ms);
  }

  hide(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.toast.set(null);
  }
}
