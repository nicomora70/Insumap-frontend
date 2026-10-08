import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './api'
import { mapKey, suggestionsKey } from './injections'
import type { MapResponse } from './injections'

export type GridSize = 2 | 4 | 6

export function useSetGridSize() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (grid_size: GridSize) =>
      apiFetch<MapResponse>('/settings/grid', { method: 'PUT', body: { grid_size } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mapKey })
      void queryClient.invalidateQueries({ queryKey: suggestionsKey })
    },
  })
}
