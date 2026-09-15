import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiConfig, apiRequest } from '../services/api'
import { useApiListQuery } from './hooks'
import { queryKeys } from './queryKeys'
import type {
  DataEnvelope,
  EntityId,
  GoogleAdsAccount,
  GoogleAdsAccountRequest,
  GoogleAdsConnection,
  GoogleAdsOAuthResult,
  GoogleAdsOAuthStart,
  GoogleAdsSyncJob,
} from './types'

const ENTITY = 'ads-accounts'

function accountPath(accountId: EntityId, suffix = ''): string {
  return `/google-ads/accounts/${encodeURIComponent(accountId)}${suffix}`
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) }
}

export function useGoogleAdsAccountsQuery() {
  return useApiListQuery<GoogleAdsAccount>({
    entity: ENTITY,
    path: '/ads-accounts',
    params: { page: 1, per_page: 100 },
  })
}

function useInvalidateAccounts() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.entity(ENTITY) })
}

export function useCreateGoogleAdsAccountMutation() {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: (body: GoogleAdsAccountRequest) =>
      apiRequest<DataEnvelope<GoogleAdsAccount>>('/ads-accounts', jsonRequest('POST', body)),
    onSuccess: invalidate,
  })
}

export function useStartGoogleAdsOAuthMutation() {
  return useMutation({
    mutationFn: (accountId: EntityId) =>
      apiRequest<DataEnvelope<GoogleAdsOAuthStart>>(accountPath(accountId, '/oauth'), {
        method: 'POST',
      }),
  })
}

export function useCompleteMockGoogleAdsOAuthMutation() {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: (callbackPath: string) =>
      apiRequest<DataEnvelope<GoogleAdsOAuthResult>>(callbackPath),
    onSuccess: invalidate,
  })
}

export function useCheckGoogleAdsConnectionMutation() {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: (accountId: EntityId) =>
      apiRequest<DataEnvelope<GoogleAdsConnection>>(accountPath(accountId, '/connection')),
    onSuccess: invalidate,
  })
}

export function useSyncGoogleAdsAccountMutation() {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: (accountId: EntityId) =>
      apiRequest<DataEnvelope<GoogleAdsSyncJob>>(accountPath(accountId, '/sync'), {
        method: 'POST',
      }),
    onSuccess: invalidate,
  })
}

export function useDisconnectGoogleAdsAccountMutation() {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: (accountId: EntityId) =>
      apiRequest<void>(accountPath(accountId, '/connection'), { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useRevokeGoogleAdsGrantMutation() {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: (accountId: EntityId) =>
      apiRequest<void>(accountPath(accountId, '/grant'), { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function localOAuthCallbackPath(authorizationUrl: string): string | null {
  if (apiConfig.mode !== 'mock') return null

  const callback = new URL(authorizationUrl, window.location.origin)
  if (callback.origin !== window.location.origin) return null

  const basePath = new URL(apiConfig.baseUrl, window.location.origin).pathname.replace(/\/$/, '')
  if (callback.pathname !== basePath && !callback.pathname.startsWith(`${basePath}/`)) return null

  const relativePath = callback.pathname.slice(basePath.length) || '/'
  return `${relativePath}${callback.search}`
}
