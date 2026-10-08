import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './api'
import type { components } from './api-types'

export type MapResponse = components['schemas']['MapResponse']
export type CellOut = components['schemas']['CellOut']
export type SuggestionsResponse = components['schemas']['SuggestionsResponse']
export type SuggestionOut = components['schemas']['SuggestionOut']
export type InjectionResult = components['schemas']['InjectionResult']
export type InjectionOrigin = components['schemas']['InjectionOrigin']

export const mapKey = ['map'] as const
export const suggestionsKey = ['suggestions'] as const
export const historyKey = ['history'] as const

export function useBodyMap() {
  return useQuery({
    queryKey: mapKey,
    queryFn: () => apiFetch<MapResponse>('/map'),
  })
}

export function useSuggestions(k = 3) {
  return useQuery({
    queryKey: [...suggestionsKey, k],
    queryFn: () => apiFetch<SuggestionsResponse>(`/suggestions?k=${k}`),
  })
}

export function useRegisterInjection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { microzone_id: string; confirm_not_recovered: boolean; origin: InjectionOrigin; applied_at?: string | null }) =>
      apiFetch<InjectionResult>('/injections', { method: 'POST', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mapKey })
      void queryClient.invalidateQueries({ queryKey: suggestionsKey })
      void queryClient.invalidateQueries({ queryKey: historyKey })
    },
  })
}

export function useUndoInjection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<InjectionResult>('/injections/undo', { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mapKey })
      void queryClient.invalidateQueries({ queryKey: suggestionsKey })
      void queryClient.invalidateQueries({ queryKey: historyKey })
    },
  })
}

/** Texto anatómico local para la sugerencia (el asistente IA lo enriquece en la cosa 6). */
export function describeLocation(microzoneId: string, gridSize: number): string {
  const m = /^(ABD|MUS|BRA|GLU)-(I|D)-(\d+)-(\d+)$/.exec(microzoneId)
  if (!m) return microzoneId
  const [, macro, side, row, col] = m
  const macroLabel: Record<string, string> = {
    ABD: 'Abdomen',
    MUS: 'Muslo',
    BRA: 'Brazo',
    GLU: 'Glúteo',
  }
  const sideLabel = side === 'I' ? 'izquierdo' : 'derecho'
  const r = Number(row)
  const c = Number(col)
  const vertical = r <= gridSize / 2 ? 'parte superior' : 'parte inferior'
  const horizontal = c <= gridSize / 2 ? 'hacia adentro' : 'hacia afuera'
  return `${macroLabel[macro] ?? macro} ${sideLabel}, ${vertical} y ${horizontal}`
}

export function formatHours(hours: number): string {
  if (hours <= 0) return 'lista ahora'
  if (hours < 1) return `lista en ${Math.round(hours * 60)} min`
  if (hours < 48) return `lista en ${Math.round(hours)} h`
  return `lista en ${Math.round(hours / 24)} días`
}
