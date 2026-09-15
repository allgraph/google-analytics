import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query'
import { apiRequest, type ApiError } from '../services/api'
import {
  mapDataEnvelope,
  mapListEnvelope,
  normalizeAnalyticsBreakdown,
  normalizeAnalyticsOverview,
  normalizeGoogleAdsDimension,
  normalizeGoogleAdsEntity,
  withApiQuery,
  type FormQueryParams,
} from './adapters'
import { queryKeys, serverEntities, type QueryFilters } from './queryKeys'
import { apiRoutes } from './routes'
import type {
  AdsAccountsQuery,
  AnalyticsBreakdown,
  AnalyticsBreakdownDto,
  AnalyticsBreakdownQuery,
  AnalyticsFilters,
  AnalyticsOverview,
  AnalyticsOverviewDto,
  AnalyticsOverviewQuery,
  DataEnvelope,
  EntityId,
  GoogleAdsAccount,
  GoogleAdsConnection,
  GoogleAdsDimension,
  GoogleAdsDimensionDto,
  GoogleAdsEntitiesQuery,
  GoogleAdsEntity,
  GoogleAdsEntityDto,
  GoogleAdsSyncError,
  GoogleAdsSyncHistoryQuery,
  GoogleAdsSyncJob,
  ListEnvelope,
  PageParams,
} from './types'

interface ApiQueryOptions {
  enabled?: boolean
  staleTime?: number
}

interface ApiListQueryOptions extends ApiQueryOptions {
  entity: string
  path: string
  params: FormQueryParams & PageParams
}

const normalizedPage = (params: Partial<PageParams>): PageParams => {
  const hasExplicitPagination = params.page !== undefined || params.per_page !== undefined
  return {
    page: params.page ?? 1,
    per_page: params.per_page ?? (hasExplicitPagination ? 50 : 100),
  }
}

export function useApiQuery<T>(
  queryKey: QueryKey,
  path: string,
  options: ApiQueryOptions = {},
): UseQueryResult<T, ApiError> {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => apiRequest<T>(path, { signal }),
    ...options,
  })
}

export function useApiListQuery<T>({
  entity,
  path,
  params,
  ...options
}: ApiListQueryOptions): UseQueryResult<ListEnvelope<T>, ApiError> {
  const { page, per_page: perPage, filters: nestedFilters, ...rest } = params
  const filters = { ...rest, ...nestedFilters } as QueryFilters
  const queryKey = queryKeys.list(entity, filters, { page, per_page: perPage })

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => apiRequest<ListEnvelope<T>>(withApiQuery(path, params), { signal }),
    ...options,
  })
}

export function useAdsAccountsQuery(
  params: AdsAccountsQuery = {},
): UseQueryResult<ListEnvelope<GoogleAdsAccount>, ApiError> {
  const page = normalizedPage(params)
  return useQuery({
    queryKey: queryKeys.list(serverEntities.adsAccounts, params, page),
    queryFn: ({ signal }) =>
      apiRequest<ListEnvelope<GoogleAdsAccount>>(withApiQuery(apiRoutes.adsAccounts.list, params), {
        signal,
      }),
  })
}

export function useAdsAccountQuery(
  accountId: EntityId,
  options: ApiQueryOptions = {},
): UseQueryResult<DataEnvelope<GoogleAdsAccount>, ApiError> {
  return useApiQuery(
    queryKeys.detail(serverEntities.adsAccounts, accountId),
    apiRoutes.adsAccounts.detail(accountId),
    options,
  )
}

export function useGoogleAdsConnectionQuery(
  accountId: EntityId,
  options: ApiQueryOptions = {},
): UseQueryResult<DataEnvelope<GoogleAdsConnection>, ApiError> {
  return useApiQuery(
    queryKeys.detail(serverEntities.googleAdsConnections, accountId),
    apiRoutes.googleAds.connection(accountId),
    options,
  )
}

export function useAnalyticsOverviewQuery(
  params: AnalyticsOverviewQuery = {},
): UseQueryResult<DataEnvelope<AnalyticsOverview>, ApiError> {
  return useQuery({
    queryKey: queryKeys.filtered(serverEntities.analyticsOverview, params),
    queryFn: async ({ signal }) => {
      const envelope = await apiRequest<DataEnvelope<AnalyticsOverviewDto>>(
        withApiQuery(apiRoutes.analytics.overview, params),
        { signal },
      )
      return mapDataEnvelope(envelope, normalizeAnalyticsOverview)
    },
  })
}

export function useAnalyticsBreakdownQuery(
  params: AnalyticsBreakdownQuery,
): UseQueryResult<DataEnvelope<AnalyticsBreakdown>, ApiError> {
  return useQuery({
    queryKey: queryKeys.list(serverEntities.analyticsBreakdown, params, normalizedPage(params)),
    queryFn: async ({ signal }) => {
      const envelope = await apiRequest<DataEnvelope<AnalyticsBreakdownDto>>(
        withApiQuery(apiRoutes.analytics.breakdown, params),
        { signal },
      )
      return mapDataEnvelope(envelope, normalizeAnalyticsBreakdown)
    },
  })
}

export function useGoogleAdsEntitiesQuery(
  accountId: EntityId,
  params: GoogleAdsEntitiesQuery,
): UseQueryResult<ListEnvelope<GoogleAdsEntity | GoogleAdsDimension>, ApiError> {
  const { entity, ...filters } = params
  return useQuery({
    queryKey: queryKeys.list(
      serverEntities.googleAdsEntities,
      { accountId, entity, ...filters },
      normalizedPage(params),
    ),
    queryFn: async ({ signal }) => {
      const envelope = await apiRequest<ListEnvelope<GoogleAdsEntityDto | GoogleAdsDimensionDto>>(
        withApiQuery(apiRoutes.analytics.entities(accountId, entity), filters),
        {
          signal,
        },
      )
      return mapListEnvelope(envelope, (row) =>
        'id' in row ? normalizeGoogleAdsEntity(row) : normalizeGoogleAdsDimension(row),
      )
    },
  })
}

export function useGoogleAdsMapQuery(
  params: AnalyticsFilters = {},
): UseQueryResult<ListEnvelope<GoogleAdsDimension>, ApiError> {
  return useQuery({
    queryKey: queryKeys.filtered(serverEntities.googleAdsEntities, { view: 'map', ...params }),
    queryFn: async ({ signal }) => {
      const envelope = await apiRequest<ListEnvelope<GoogleAdsDimensionDto>>(
        withApiQuery(apiRoutes.analytics.map, params),
        { signal },
      )
      return mapListEnvelope(envelope, normalizeGoogleAdsDimension)
    },
  })
}

export function useGoogleAdsSyncJobsQuery(
  params: GoogleAdsSyncHistoryQuery = {},
): UseQueryResult<ListEnvelope<GoogleAdsSyncJob>, ApiError> {
  return useQuery({
    queryKey: queryKeys.list(serverEntities.googleAdsSyncJobs, params, normalizedPage(params)),
    queryFn: ({ signal }) =>
      apiRequest<ListEnvelope<GoogleAdsSyncJob>>(
        withApiQuery(apiRoutes.googleAds.syncJobs, params),
        { signal },
      ),
  })
}

export function useGoogleAdsSyncErrorsQuery(
  params: GoogleAdsSyncHistoryQuery = {},
): UseQueryResult<ListEnvelope<GoogleAdsSyncError>, ApiError> {
  return useQuery({
    queryKey: queryKeys.list(serverEntities.googleAdsSyncErrors, params, normalizedPage(params)),
    queryFn: ({ signal }) =>
      apiRequest<ListEnvelope<GoogleAdsSyncError>>(
        withApiQuery(apiRoutes.googleAds.syncErrors, params),
        { signal },
      ),
  })
}
