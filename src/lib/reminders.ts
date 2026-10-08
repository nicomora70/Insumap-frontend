import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './api'
import type { components } from './api-types'

export type ScheduleResponse = components['schemas']['ScheduleResponse']
export type DoseIn = components['schemas']['DoseIn']
export type ReminderOut = components['schemas']['ReminderOut']
export type ConfirmResponse = components['schemas']['ConfirmResponse']

export const scheduleKey = ['schedule'] as const
export const upcomingKey = ['upcoming'] as const

export function useSchedule() {
  return useQuery({
    queryKey: scheduleKey,
    queryFn: () => apiFetch<ScheduleResponse>('/schedule'),
  })
}

export function useSaveSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (doses: DoseIn[]) =>
      apiFetch<ScheduleResponse>('/schedule', { method: 'PUT', body: { doses } }),
    onSuccess: (data) => {
      queryClient.setQueryData(scheduleKey, data)
      void queryClient.invalidateQueries({ queryKey: upcomingKey })
    },
  })
}

export function useUpcoming() {
  return useQuery({
    queryKey: upcomingKey,
    queryFn: () => apiFetch<ReminderOut[]>('/reminders/upcoming'),
    refetchInterval: 60_000,
  })
}

export function useSnoozeReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      apiFetch<ReminderOut>(`/reminders/${id}/snooze`, { method: 'POST', body: { minutes } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: upcomingKey })
    },
  })
}

export function useConfirmReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<ConfirmResponse>(`/reminders/${id}/confirm`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: upcomingKey })
    },
  })
}

/* ---------------- Web Push ---------------- */

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/') + padding)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function ensurePushSubscription(): Promise<'subscribed' | 'denied' | 'unsupported'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  const vapid = await apiFetch<Record<string, string>>('/push/vapid-public-key')
  const key = vapid.public_key ?? Object.values(vapid)[0]
  if (!key) return 'unsupported'
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
  }
  const subJson = sub.toJSON()
  await apiFetch('/push/subscriptions', {
    method: 'POST',
    body: {
      endpoint: sub.endpoint,
      p256dh: subJson.keys?.p256dh ?? '',
      auth: subJson.keys?.auth ?? '',
      user_agent: navigator.userAgent,
    },
  })
  return 'subscribed'
}
