import type { CellOut, CellColor, MapResponse, MacroSide } from '../data/types';

export type MacroCode = 'ABD' | 'MUS' | 'BRA' | 'GLU';

export const MACRO_LABEL: Record<MacroCode, string> = {
  ABD: 'Abdomen',
  MUS: 'Muslos',
  BRA: 'Brazos',
  GLU: 'Glúteos',
};

export const MACROS: MacroCode[] = ['ABD', 'BRA', 'MUS', 'GLU'];

export function worstColor(cells: CellOut[]): CellColor {
  if (cells.some((c) => c.color === 'RED')) return 'RED';
  if (cells.some((c) => c.color === 'YELLOW')) return 'YELLOW';
  return 'GREEN';
}

export function parseMacro(id: string): MacroCode | null {
  const m = /^(ABD|MUS|BRA|GLU)-/.exec(id);
  return (m?.[1] as MacroCode | undefined) ?? null;
}

export function parseSide(id: string): MacroSide | null {
  const m = /-(I|D)-\d+-\d+$/.exec(id);
  return (m?.[1] as MacroSide | undefined) ?? null;
}

export function macroSideCells(map: MapResponse, macro: MacroCode, side: MacroSide): CellOut[] {
  const zone = map.zones.find((z) => z.macro === macro);
  return zone?.sides.find((s) => s.side === side)?.cells ?? [];
}

export function macroCells(map: MapResponse, macro: MacroCode): CellOut[] {
  const zone = map.zones.find((z) => z.macro === macro);
  return zone?.sides.flatMap((s) => s.cells) ?? [];
}
