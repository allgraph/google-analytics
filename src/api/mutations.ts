import { useMutation, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { apiFileRequest, apiRequest } from '../services/api'
import { withApiQuery } from './adapters'
import { queryKeys, serverEntities } from './queryKeys'
import { apiRoutes } from './routes'
import type {
  AdsAccountWriteRequest,
  AnalyticsExportRequest,
  DataEnvelope,
  EntityId,
  GoogleAdsAccount,
  GoogleAdsConnection,
  GoogleAdsOAuthCallback,
  GoogleAdsOAuthStart,
  GoogleAdsReconcileRequest,
  GoogleAdsSyncJob,
  GoogleAdsSyncRequest,
} from './types'

interface AccountWriteVariables {
  accountId: EntityId
  body: AdsAccountWriteRequest
}

const jsonRequest = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
})

export function advertisingInvalidationKeys(accountId?: EntityId): QueryKey[] {
  const keys: QueryKey[] = [
    queryKeys.entity(serverEntities.adsAccounts),
    queryKeys.entity(serverEntities.analyticsOverview),
    queryKeys.entity(serverEntities.analyticsBreakdown),
    queryKeys.entity(serverEntities.googleAdsEntities),
  ]
  if (accountId) {
    keys.push(
      queryKeys.detail(serverEntities.adsAccounts, accountId),
      queryKeys.detail(serverEntities.googleAdsConnections, accountId),
    )
  }
  return keys
}

export function syncInvalidationKeys(accountId: EntityId): QueryKey[] {
  return [
    ...advertisingInvalidationKeys(accountId),
    queryKeys.entity(serverEntities.googleAdsSyncJobs),
    queryKeys.entity(serverEntities.googleAdsSyncErrors),
  ]
}

async function invalidateKeys(client: QueryClient, keys: QueryKey[]) {
  await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })))
}

async function invalidateAdvertisingData(client: QueryClient, accountId?: EntityId) {
  await invalidateKeys(client, advertisingInvalidationKeys(accountId))
}

async function invalidateSyncData(client: QueryClient, accountId: EntityId) {
  await invalidateKeys(client, syncInvalidationKeys(accountId))
}

export function useCreateAdsAccountMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: AdsAccountWriteRequest) =>
      apiRequest<DataEnvelope<GoogleAdsAccount>>(
        apiRoutes.adsAccounts.list,
        jsonRequest('POST', body),
      ),
    onSuccess: async () => invalidateAdvertisingData(client),
  })
}

export function useUpdateAdsAccountMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, body }: AccountWriteVariables) =>
      apiRequest<DataEnvelope<GoogleAdsAccount>>(
        apiRoutes.adsAccounts.detail(accountId),
        jsonRequest('PUT', body),
      ),
    onSuccess: async (_data, { accountId }) => invalidateAdvertisingData(client, accountId),
  })
}

export function useDeleteAdsAccountMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (accountId: EntityId) =>
      apiRequest<DataEnvelope<void>>(apiRoutes.adsAccounts.detail(accountId), {
        method: 'DELETE',
      }),
    onSuccess: async (_data, accountId) => invalidateAdvertisingData(client, accountId),
  })
}

export function useStartGoogleAdsOAuthMutation() {
  return useMutation({
    mutationFn: (accountId: EntityId) =>
      apiRequest<DataEnvelope<GoogleAdsOAuthStart>>(apiRoutes.googleAds.oauth(accountId), {
        method: 'POST',
      }),
  })
}

export function useCompleteGoogleAdsOAuthCallbackMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (callbackPath: string) =>
      apiRequest<DataEnvelope<GoogleAdsOAuthCallback>>(callbackPath),
    onSuccess: async ({ data }) => invalidateAdvertisingData(client, data.ads_account_id),
  })
}

export function useCheckGoogleAdsConnectionMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (accountId: EntityId) =>
      apiRequest<DataEnvelope<GoogleAdsConnection>>(apiRoutes.googleAds.connection(accountId)),
    onSuccess: async (_data, accountId) => invalidateAdvertisingData(client, accountId),
  })
}

export function useDisconnectGoogleAdsMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (accountId: EntityId) =>
      apiRequest<DataEnvelope<void>>(apiRoutes.googleAds.connection(accountId), {
        method: 'DELETE',
      }),
    onSuccess: async (_data, accountId) => invalidateAdvertisingData(client, accountId),
  })
}

export function useRevokeGoogleAdsGrantMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (accountId: EntityId) =>
      apiRequest<DataEnvelope<void>>(apiRoutes.googleAds.grant(accountId), {
        method: 'DELETE',
      }),
    onSuccess: async (_data, accountId) => invalidateAdvertisingData(client, accountId),
  })
}

export function useSyncGoogleAdsAccountMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, through }: GoogleAdsSyncRequest & { accountId: EntityId }) =>
      apiRequest<DataEnvelope<GoogleAdsSyncJob>>(
        withApiQuery(apiRoutes.googleAds.sync(accountId), { through }),
        { method: 'POST' },
      ),
    onSuccess: async (_data, { accountId }) => invalidateSyncData(client, accountId),
  })
}

export function useReconcileGoogleAdsAccountMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, day }: GoogleAdsReconcileRequest & { accountId: EntityId }) =>
      apiRequest<DataEnvelope<GoogleAdsSyncJob>>(
        withApiQuery(apiRoutes.googleAds.reconcile(accountId), { day }),
        { method: 'POST' },
      ),
    onSuccess: async (_data, { accountId }) => invalidateSyncData(client, accountId),
  })
}

export function useAnalyticsExportMutation() {
  return useMutation({
    mutationFn: (request: AnalyticsExportRequest) =>
      apiFileRequest(withApiQuery(apiRoutes.analytics.export, request)),
  })
}
