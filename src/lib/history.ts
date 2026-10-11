import { useInfiniteQuery } from '@tanstack/react-query'
import { apiFetch } from './api'
import type { components } from './api-types'
import { historyKey } from './injections'

export type HistoryPage = components['schemas']['HistoryPage']
export type InjectionOut = components['schemas']['InjectionOut']

const PAGE_SIZE = 20

export function useHistory() {
  return useInfiniteQuery({
    queryKey: historyKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      apiFetch<HistoryPage>(
        `/history?limit=${PAGE_SIZE}&order=desc${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  })
}

const STATUS_LABEL: Record<InjectionOut['status'], { text: string; className: string }> = {
  REGISTERED: {
    text: 'Registrada',
    className: 'bg-mz-green-soft text-mz-green dark:bg-white/10 dark:text-[#8fe0bd]',
  },
  UNDONE: {
    text: 'Deshecha',
    className: 'bg-primary-soft text-muted dark:bg-white/10 dark:text-muted-dark',
  },
}

export function statusBadge(status: InjectionOut['status']) {
  return STATUS_LABEL[status]
}

/** Fecha y hora en español, zona del dispositivo (el backend guarda UTC). */
export function formatAppliedAt(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return { date, time }
}
