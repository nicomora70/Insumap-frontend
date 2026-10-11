import type { Type } from '@angular/core';
import {
  LucideBellRing,
  LucideHistory,
  LucideMap,
  LucideSparkles,
  LucideUserRound,
  LucideUsers,
} from '@lucide/angular';

export interface ShellTab {
  id: string;
  label: string;
  route: string;
  icon: Type<unknown>;
}

/** Navegación del paciente: mismos destinos en móvil (inferior) y escritorio (lateral). */
export const PATIENT_TABS: ShellTab[] = [
  { id: 'mapa', label: 'Mapa', route: '/mapa', icon: LucideMap },
  { id: 'historial', label: 'Historial', route: '/historial', icon: LucideHistory },
  { id: 'dosis', label: 'Dosis', route: '/dosis', icon: LucideBellRing },
  { id: 'ayuda', label: 'Ayuda', route: '/ayuda', icon: LucideSparkles },
  { id: 'perfil', label: 'Perfil', route: '/perfil', icon: LucideUserRound },
];

/** Navegación del médico. */
export const DOCTOR_TABS: ShellTab[] = [
  { id: 'pacientes', label: 'Pacientes', route: '/pacientes', icon: LucideUsers },
  { id: 'perfil', label: 'Perfil', route: '/cuenta', icon: LucideUserRound },
];
