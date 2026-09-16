import type {
  AnalyticsBreakdownQuery,
  AnalyticsExportRequest,
  BreakdownGroup,
  ExportFormat,
} from '../api/types'
import type { UrlFiltersApi } from './useUrlFilters'

export const NO_ACCOUNTS = 'none'

export function accountIdsFromUrl(
  values: Record<string, string>,
  availableIds: readonly string[],
): string[] {
  const raw = values.ads_account_ids ?? values.ads_account_id
  if (!raw) return [...availableIds]
  if (raw === NO_ACCOUNTS) return []
  const available = new Set(availableIds)
  return [...new Set(raw.split(',').filter((id) => id && available.has(id)))]
}

export function accountIdsToUrl(
  ids: readonly string[],
  availableIds: readonly string[],
): string | null {
  if (ids.length === 0) return NO_ACCOUNTS
  const selected = new Set(ids)
  return availableIds.length > 0 && availableIds.every((id) => selected.has(id))
    ? null
    : ids.join(',')
}

function apiFilters(filters: UrlFiltersApi) {
  const { page, per_page, ads_account_id, ads_account_ids, ...rest } = filters.toQueryParams()
  const rawAccountIds = String(ads_account_ids ?? ads_account_id ?? '')
  return {
    page,
    per_page,
    ...rest,
    ...(rawAccountIds && rawAccountIds !== NO_ACCOUNTS
      ? { ads_account_ids: rawAccountIds.split(',').filter(Boolean) }
      : {}),
  }
}

export function breakdownQueryFromUrl(
  filters: UrlFiltersApi,
  groupBy: BreakdownGroup,
): AnalyticsBreakdownQuery {
  return { ...apiFilters(filters), group_by: groupBy } as AnalyticsBreakdownQuery
}

export function exportRequestFromUrl(
  filters: UrlFiltersApi,
  groupBy: BreakdownGroup,
  columns: readonly string[],
  format: ExportFormat,
): AnalyticsExportRequest {
  const { page: _page, per_page: _perPage, ...query } = apiFilters(filters)
  return { ...query, group_by: groupBy, columns, format } as AnalyticsExportRequest
}
