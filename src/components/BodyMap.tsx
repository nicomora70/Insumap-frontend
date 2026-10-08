import { useMemo, useState } from 'react'
import type { CellOut, MapResponse } from '../lib/injections'

export type BodyView = 'front' | 'back'
export type MacroCode = 'ABD' | 'MUS' | 'BRA' | 'GLU'

const STATUS_FILL: Record<CellOut['color'], string> = {
  RED: '#ff3b30',
  YELLOW: '#ffcc00',
  GREEN: '#34c759',
}

/** Macros visibles por vista, según la anatomía del backend (location.py). */
const VIEW_MACROS: Record<BodyView, MacroCode[]> = {
  front: ['ABD', 'MUS'],
  back: ['GLU', 'BRA'],
}

const MACRO_LABEL: Record<MacroCode, string> = {
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

function parseMacro(id: string): MacroCode | null {
  const m = /^(ABD|MUS|BRA|GLU)-/.exec(id)
  return (m?.[1] as MacroCode | undefined) ?? null
}

function parseSide(id: string): 'I' | 'D' | null {
  const m = /-(I|D)-\d+-\d+$/.exec(id)
  return (m?.[1] as 'I' | 'D' | undefined) ?? null
}

/* ---------- Silhouette + zones (flat 2D, viewBox 0 0 200 400) ---------- */

function ZoneShape({ macro, color, dimmed, onTap, label }: {
  macro: MacroCode
  color: CellOut['color']
  dimmed?: boolean
  onTap?: () => void
  label: string
}) {
  const fill = STATUS_FILL[color]
  const pattern = color === 'RED' ? 'url(#bodymap-stripes)' : color === 'YELLOW' ? 'url(#bodymap-dots)' : undefined
  const rects: Record<MacroCode, { x: number; y: number; w: number; h: number; rx: number }[]> = {
    ABD: [{ x: 80, y: 106, w: 40, h: 54, rx: 9 }],
    MUS: [
      { x: 69, y: 198, w: 24, h: 86, rx: 10 },
      { x: 107, y: 198, w: 24, h: 86, rx: 10 },
    ],
    GLU: [
      { x: 73, y: 194, w: 22, h: 40, rx: 10 },
      { x: 105, y: 194, w: 22, h: 40, rx: 10 },
    ],
    BRA: [
      { x: 52, y: 68, w: 13, h: 78, rx: 6.5 },
      { x: 135, y: 68, w: 13, h: 78, rx: 6.5 },
    ],
  }
  const common = {
    fill,
    fillOpacity: dimmed ? 0.06 : 0.28,
    stroke: fill,
    strokeOpacity: dimmed ? 0.2 : 0.85,
    strokeWidth: 1.25,
    style: onTap ? { cursor: 'pointer' } : undefined,
    onClick: onTap,
  }
  return (
    <g role={onTap ? 'button' : undefined} aria-label={onTap ? label : undefined} tabIndex={onTap ? 0 : undefined}
      onKeyDown={onTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap() } } : undefined}
    >
      {rects[macro].map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} {...common} />
      ))}
      {pattern && !dimmed &&
        rects[macro].map((r, i) => (
          <rect key={`p${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} fill={pattern} pointerEvents="none" />
        ))}
    </g>
  )
}

/** Centroide aproximado de cada macro para la estrella ★ de sugerencia. */
const STAR_AT: Record<MacroCode, { x: number; y: number }> = {
  ABD: { x: 100, y: 131 },
  MUS: { x: 81, y: 241 },
  GLU: { x: 116, y: 213 },
  BRA: { x: 141, y: 107 },
}

export default function BodyMap({ map, suggestionId, onSelectMacro }: {
  map: MapResponse
  suggestionId: string | null
  onSelectMacro: (macro: MacroCode) => void
}) {
  const [view, setView] = useState<BodyView>('front')

  const byMacro = useMemo(() => {
    const acc = new globalThis.Map<MacroCode, CellOut[]>()
    for (const z of map.zones) {
      const cells = z.sides.flatMap((s) => s.cells)
      acc.set(z.macro as MacroCode, cells)
    }
    return acc
  }, [map])

  const suggestedMacro = suggestionId ? parseMacro(suggestionId) : null
  const suggestedElsewhere =
    suggestedMacro !== null && !VIEW_MACROS[view].includes(suggestedMacro)

  return (
    <div>
      {/* Toggle frente / espalda (P04) */}
      <div className="mx-auto grid w-56 grid-cols-2 gap-1 rounded-2xl bg-black/5 p-1 dark:bg-white/10" role="group" aria-label="Vista del cuerpo">
        {(['front', 'back'] as BodyView[]).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`touch-target rounded-xl text-[14px] font-semibold ${
              view === v ? 'bg-white shadow dark:bg-[#1c1c1e]' : 'text-black/50 dark:text-white/50'
            }`}
          >
            {v === 'front' ? 'Frente' : 'Espalda'}
          </button>
        ))}
      </div>

      <svg
        viewBox="0 0 200 400"
        role="img"
        aria-label={view === 'front' ? 'Cuerpo de frente: abdomen y muslos' : 'Cuerpo de espalda: glúteos y brazos'}
        className="mx-auto mt-1 h-[430px] w-auto"
      >
        <defs>
          <pattern id="bodymap-stripes" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#ff3b30" strokeOpacity="0.55" strokeWidth="1.6" />
          </pattern>
          <pattern id="bodymap-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#8a6d00" fillOpacity="0.5" />
          </pattern>
        </defs>

        {/* Silueta line-art (trazo fino, sin relleno) */}
        <g fill="none" className="stroke-[#8e8e93]" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={100} cy={24} r={15} />
          <path
            d="M91,40 L78,46 C68,49 61,55 59,66 L52,130 C51,150 52,166 55,176
               C56,183 63,183 64,176 L67,132 C69,116 71,106 73,100 L75,150
               C76,165 75,176 73,186 C71,196 69,212 69,226 L67,306
               C67,315 70,319 76,319 L84,319 C90,319 92,315 92,308 L94,232
               C95,224 97,218 100,218 C103,218 105,224 106,232 L108,308
               C108,315 110,319 116,319 L124,319 C130,319 133,315 133,306
               L131,226 C131,212 129,196 127,186 C125,176 124,165 125,150 L127,100
               C129,106 131,116 133,132 L136,176 C137,183 144,183 145,176
               C148,166 149,150 148,130 L141,66 C139,55 132,49 122,46 L109,40 Z"
          />
        </g>

        {/* Zonas visibles tocables + resto atenuado como contexto */}
        {(['ABD', 'MUS', 'GLU', 'BRA'] as MacroCode[]).map((macro) => {
          const cells = byMacro.get(macro) ?? []
          const visible = VIEW_MACROS[view].includes(macro)
          if (cells.length === 0) return null
          return (
            <ZoneShape
              key={macro}
              macro={macro}
              color={worstColor(cells)}
              dimmed={!visible}
              onTap={visible ? () => onSelectMacro(macro) : undefined}
              label={`${MACRO_LABEL[macro]}, toca para ver su cuadrícula`}
            />
          )
        })}

        {/* ★ sugerencia (P04: pulsa con borde estrella) */}
        {suggestedMacro && VIEW_MACROS[view].includes(suggestedMacro) && (
          <g transform={`translate(${STAR_AT[suggestedMacro].x} ${STAR_AT[suggestedMacro].y})`} pointerEvents="none">
            <circle r={13} className="fill-[#0a84ff]" fillOpacity={0.9} />
            <text textAnchor="middle" dy={5.5} fontSize={14} fontWeight="bold" className="fill-white">
              ★
            </text>
          </g>
        )}
      </svg>

      {suggestedElsewhere && suggestedMacro && (
        <button
          type="button"
          onClick={() => setView(view === 'front' ? 'back' : 'front')}
          className="pressable mx-auto mt-1 block rounded-full bg-[#0a84ff]/10 px-4 py-2 text-[13px] font-semibold text-[#0a84ff]"
        >
          ★ La sugerencia está en {view === 'front' ? 'la espalda' : 'el frente'}: {MACRO_LABEL[suggestedMacro]} — ver
        </button>
      )}

      <p className="mt-2 text-center text-[12px] text-black/40 dark:text-white/40">
        Toca una zona del cuerpo o un nombre para ver su cuadrícula · ✕ rojo ! amarillo ✓ verde
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {VIEW_MACROS[view].map((macro) => (
          <button
            key={macro}
            type="button"
            onClick={() => onSelectMacro(macro)}
            className="pressable rounded-full bg-black/5 px-4 py-2 text-[13px] font-semibold dark:bg-white/10"
          >
            {MACRO_LABEL[macro]}
          </button>
        ))}
      </div>
    </div>
  )
}

export function macroSideCells(map: MapResponse, macro: MacroCode, side: 'I' | 'D'): CellOut[] {
  const zone = map.zones.find((z) => z.macro === macro)
  return zone?.sides.find((s) => s.side === side)?.cells ?? []
}

export { MACRO_LABEL, parseMacro, parseSide }
