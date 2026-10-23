import type { CellColor } from '../data/types';

/**
 * Colores del velo del cuerpo 3D y de la leyenda. Fuente única: la leyenda y el
 * modelo no pueden divergir.
 *
 * Reglas:
 * - Los tres estados siguen siendo rojo, amarillo y verde (HU-07). El amarillo
 *   nunca se sustituye por cian ni azul.
 * - Son más saturados que los tokens de superficie para leerse sobre la
 *   textura del músculo, pero del mismo tono.
 */
export const ZONE_HEX: Record<CellColor, string> = {
  RED: '#e0533c',
  YELLOW: '#e8a41c',
  GREEN: '#4f9e6b',
};

/** Zona recomendada: verde profundo + estrella y la palabra "Sugerida". */
export const SUGGESTED_HEX = '#2b8a5f';

/** Fuerza de la mezcla en el centro de la zona (0 = modelo intacto). */
export const ZONE_STRENGTH: Record<CellColor, number> = {
  RED: 0.74,
  YELLOW: 0.78,
  GREEN: 0.68,
};

export const SUGGESTED_STRENGTH = 0.78;
