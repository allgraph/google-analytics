import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../services/api'
import { queryKeys, serverEntities } from './queryKeys'
import type {
  DataEnvelope,
  EntityId,
  LeadDetails,
  LeadStatusChangeRequest,
  MatchingDecision,
  MatchingDecisionRequest,
} from './types'

interface LeadStatusVariables {
  leadId: EntityId
  body: LeadStatusChangeRequest
}

interface MatchingDecisionVariables {
  callId: EntityId
  body: MatchingDecisionRequest
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) }
}

export function useChangeLeadStatusMutation() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ leadId, body }: LeadStatusVariables) =>
      apiRequest<DataEnvelope<LeadDetails>>(
        `/leads/${encodeURIComponent(leadId)}/status`,
        jsonRequest('POST', body),
      ),
    onSuccess: async (_data, { leadId }) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.entity(serverEntities.leads) }),
        client.invalidateQueries({ queryKey: queryKeys.entity(serverEntities.leadStatusCounts) }),
        client.invalidateQueries({ queryKey: queryKeys.detail(serverEntities.leads, leadId) }),
      ])
    },
  })
}

export function useSaveMatchingDecisionMutation() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ callId, body }: MatchingDecisionVariables) =>
      apiRequest<DataEnvelope<MatchingDecision>>(
        `/calls/${encodeURIComponent(callId)}/matching-decision`,
        jsonRequest('PUT', body),
      ),
    onSuccess: async (_data, { callId }) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.entity(serverEntities.matchingReview) }),
        client.invalidateQueries({ queryKey: queryKeys.detail(serverEntities.calls, callId) }),
      ])
    },
  })
}
