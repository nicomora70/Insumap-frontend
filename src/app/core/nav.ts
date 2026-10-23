export interface ShellTab {
  id: string;
  label: string;
  route: string;
}

/** Navegación del paciente: mismos destinos en móvil (barra inferior) y escritorio (header). */
export const PATIENT_TABS: ShellTab[] = [
  { id: 'mapa', label: 'Mapa', route: '/mapa' },
  { id: 'historial', label: 'Historial', route: '/historial' },
  { id: 'dosis', label: 'Dosis', route: '/dosis' },
  { id: 'ayuda', label: 'Ayuda', route: '/ayuda' },
  { id: 'perfil', label: 'Perfil', route: '/perfil' },
];

/** Navegación del médico. */
export const DOCTOR_TABS: ShellTab[] = [
  { id: 'pacientes', label: 'Pacientes', route: '/pacientes' },
  { id: 'perfil', label: 'Perfil', route: '/cuenta' },
];
