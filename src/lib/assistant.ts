import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './api'
import type { components } from './api-types'

export type AssistantMessageOut = components['schemas']['AssistantMessageOut']
export type AssistantReply = components['schemas']['AssistantReply']

export const messagesKey = ['assistant-messages'] as const

export function useAssistantMessages() {
  return useQuery({
    queryKey: messagesKey,
    queryFn: () => apiFetch<AssistantMessageOut[]>('/assistant/messages?limit=30'),
  })
}

export function useSendAssistantMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message: string) =>
      apiFetch<AssistantReply>('/assistant/messages', { method: 'POST', body: { message } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagesKey })
    },
  })
}
