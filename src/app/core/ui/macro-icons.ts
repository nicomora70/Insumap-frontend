import type { Type } from '@angular/core';
import {
  LucideBicepsFlexed,
  LucideCircleDot,
  LucideFootprints,
  LucidePersonStanding,
} from '@lucide/angular';
import type { MacroCode } from '../util/body';

/** Icono por macrozona (chips del mapa). */
export const MACRO_ICON: Record<MacroCode, Type<unknown>> = {
  ABD: LucideCircleDot,
  BRA: LucideBicepsFlexed,
  MUS: LucideFootprints,
  GLU: LucidePersonStanding,
};
