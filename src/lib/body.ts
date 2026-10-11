import type { CellOut, MapResponse } from './injections'

export type MacroCode = 'ABD' | 'MUS' | 'BRA' | 'GLU'

export const MACRO_LABEL: Record<MacroCode, string> = {
  ABD: 'Abdomen',
  MUS: 'Muslos',
  BRA: 'Brazos',
  GLU: 'Glúteos',
}

export function worstColor(cells: CellOut[]): CellOut['color'] {
  if (cells.some((c) => c.color === 'RED')) return 'RED'
  if (cells.some((c) => c.color === 'YELLOW')) return 'YELLOW'
  return 'GREEN'
}

export function parseMacro(id: string): MacroCode | null {
  const m = /^(ABD|MUS|BRA|GLU)-/.exec(id)
  return (m?.[1] as MacroCode | undefined) ?? null
}

export function parseSide(id: string): 'I' | 'D' | null {
  const m = /-(I|D)-\d+-\d+$/.exec(id)
  return (m?.[1] as 'I' | 'D' | undefined) ?? null
}

export function macroSideCells(map: MapResponse, macro: MacroCode, side: 'I' | 'D'): CellOut[] {
  const zone = map.zones.find((z) => z.macro === macro)
  return zone?.sides.find((s) => s.side === side)?.cells ?? []
}

export function macroCells(map: MapResponse, macro: MacroCode): CellOut[] {
  const zone = map.zones.find((z) => z.macro === macro)
  return zone?.sides.flatMap((s) => s.cells) ?? []
}

/** Tinte pastel del cuerpo 3D por estado (el estado se repite con icono + palabra). */
export const BODY_TINT: Record<CellOut['color'], string> = {
  RED: '#f0a19c',
  YELLOW: '#f5cf8d',
  GREEN: '#a9e0c6',
}
export const BODY_NEUTRAL = '#d9d2ec'

export function macroTint(map: MapResponse, macro: MacroCode): string {
  const cells = macroCells(map, macro)
  return cells.length === 0 ? BODY_NEUTRAL : BODY_TINT[worstColor(cells)]
}
