import type { CellColor, InjectionOut } from '../data/types';

export const COLOR_WORD: Record<CellColor, string> = {
  RED: 'ROJO',
  YELLOW: 'AMARILLO',
  GREEN: 'VERDE',
};

export const COLOR_LABEL: Record<CellColor, string> = {
  RED: 'roja, en recuperación',
  YELLOW: 'amarilla, casi lista',
  GREEN: 'verde, disponible',
};

/** Clases de la cuadrícula: color + patrón (el estado nunca es solo color, RNF-05). */
export const CELL_STYLE: Record<CellColor, string> = {
  RED: 'bg-mz-red-soft text-mz-red pattern-red',
  YELLOW: 'bg-mz-yellow-soft text-mz-yellow pattern-yellow',
  GREEN: 'bg-mz-green-soft text-mz-green pattern-green',
};

/** Texto anatómico local para la sugerencia (el asistente IA lo enriquece). */
export function describeLocation(microzoneId: string, gridSize: number): string {
  const m = /^(ABD|MUS|BRA|GLU)-(I|D)-(\d+)-(\d+)$/.exec(microzoneId);
  if (!m) return microzoneId;
  const [, macro, side, row, col] = m;
  const macroLabel: Record<string, string> = {
    ABD: 'Abdomen',
    MUS: 'Muslo',
    BRA: 'Brazo',
    GLU: 'Glúteo',
  };
  const sideLabel = side === 'I' ? 'izquierdo' : 'derecho';
  const r = Number(row);
  const c = Number(col);
  const vertical = r <= gridSize / 2 ? 'parte superior' : 'parte inferior';
  const horizontal = c <= gridSize / 2 ? 'hacia adentro' : 'hacia afuera';
  return `${macroLabel[macro] ?? macro} ${sideLabel}, ${vertical} y ${horizontal}`;
}

export function formatHours(hours: number): string {
  if (hours <= 0) return 'lista ahora';
  if (hours < 1) return `lista en ${Math.round(hours * 60)} min`;
  if (hours < 48) return `lista en ${Math.round(hours)} h`;
  return `lista en ${Math.round(hours / 24)} días`;
}

const STATUS_LABEL: Record<InjectionOut['status'], { text: string; className: string }> = {
  REGISTERED: {
    text: 'Registrada',
    className: 'bg-mz-green-soft text-mz-green dark:bg-white/10 dark:text-[#8fe0bd]',
  },
  UNDONE: {
    text: 'Deshecha',
    className: 'bg-primary-soft text-muted dark:bg-white/10 dark:text-muted-dark',
  },
};

export function statusBadge(status: InjectionOut['status']) {
  return STATUS_LABEL[status];
}

/** Fecha y hora en español, zona del dispositivo (el backend guarda UTC). */
export function formatAppliedAt(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

export function formatDue(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Hoy ${time}`;
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} ${time}`;
}
