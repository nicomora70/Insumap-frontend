import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiBase, apiFetch, authHeaders } from './api'
import type { components } from './api-types'
import type { MapResponse } from './injections'
import type { HistoryPage } from './history'

export type LinkOut = components['schemas']['LinkOut']
export type LinkCodeOut = components['schemas']['LinkCodeOut']

export const linksKey = ['links'] as const

export function useLinks() {
  return useQuery({
    queryKey: linksKey,
    queryFn: () => apiFetch<LinkOut[]>('/links'),
  })
}

export function useCreateCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<LinkCodeOut>('/links/codes', { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: linksKey })
    },
  })
}

export function useRevokeLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) => apiFetch<void>(`/links/${linkId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: linksKey })
    },
  })
}

export function useRedeemCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<LinkOut>('/links', { method: 'POST', body: { code: code.trim().toUpperCase().replace(/-/g, '') } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: linksKey })
    },
  })
}

export function usePatientMap(patientId: string | null) {
  return useQuery({
    queryKey: ['patient-map', patientId],
    queryFn: () => apiFetch<MapResponse>(`/doctor/patients/${patientId}/map`),
    enabled: patientId !== null,
  })
}

export function usePatientHistory(patientId: string | null) {
  return useInfiniteQuery({
    queryKey: ['patient-history', patientId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      apiFetch<HistoryPage>(
        `/doctor/patients/${patientId}/history?limit=20&order=desc${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: patientId !== null,
  })
}

/** Descarga un export autenticado (el navegador no manda el Bearer en un <a>). */
export async function downloadExport(path: string, filename: string): Promise<void> {
  const res = await fetch(`${apiBase()}${path}`, { credentials: 'include', headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo generar el archivo.')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}
