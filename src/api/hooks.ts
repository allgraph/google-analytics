import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query'
import { apiRequest, type ApiError } from '../services/api'
import { withApiQuery, type FormQueryParams } from './adapters'
import { queryKeys, type QueryFilters } from './queryKeys'
import type { ListEnvelope, PageParams } from './types'

interface ApiQueryOptions {
  enabled?: boolean
  staleTime?: number
}

interface ApiListQueryOptions extends ApiQueryOptions {
  entity: string
  path: string
  params: FormQueryParams & PageParams
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
  const queryKey = queryKeys.list(entity, filters, {
    page,
    per_page: perPage,
  })

  return useQuery({
    queryKey,
    queryFn: ({ signal }) => apiRequest<ListEnvelope<T>>(withApiQuery(path, params), { signal }),
    ...options,
  })
}
