import type { TableColumnsType } from 'antd'
import type {
  AnalyticsBreakdownQuery,
  GoogleAdsDeviceRow,
  GoogleAdsDimension,
  GoogleAdsGeoRow,
} from '../api/types'
import type { UrlFiltersApi } from '../lib/useUrlFilters'

export type DimensionPageKind = 'geography' | 'devices'

const API_FILTER_KEYS = [
  'from',
  'to',
  'data_source',
  'site_id',
  'campaign_id',
  'ad_group_id',
  'keyword',
  'search_term',
  'ad_id',
  'device',
  'country',
  'region',
  'city',
  'geo_id',
] as const

/** Builds only the query parameters supported by the analytics dimensions contract. */
export function dimensionQueryFromUrl(
  filters: UrlFiltersApi,
  kind: DimensionPageKind,
): Omit<AnalyticsBreakdownQuery, 'group_by' | 'ads_account_id' | 'ads_account_ids'> {
  const source = filters.toQueryParams()
  const query: Record<string, unknown> = {
    page: source.page,
    per_page: source.per_page,
  }
  if (filters.sort) {
    query.sort = filters.sort
    query.order = filters.order ?? 'desc'
  }
  for (const key of API_FILTER_KEYS) {
    if (kind === 'devices' && ['country', 'region', 'city', 'geo_id'].includes(key)) continue
    if (kind === 'geography' && key === 'device') continue
    const value = source[key]
    if (typeof value === 'string' && value) query[key] = value
  }
  return query as Omit<AnalyticsBreakdownQuery, 'group_by' | 'ads_account_id' | 'ads_account_ids'>
}

/** Reference queries ignore dimension filters so dropdown options do not disappear after selection. */
export function dimensionReferenceQueryFromUrl(
  filters: UrlFiltersApi,
): Omit<AnalyticsBreakdownQuery, 'group_by' | 'ads_account_id' | 'ads_account_ids'> {
  const query = dimensionQueryFromUrl(filters, 'geography')
  const {
    device: _device,
    country: _country,
    region: _region,
    city: _city,
    geo_id: _geoId,
    sort: _sort,
    order: _order,
    ...reference
  } = query
  return { ...reference, page: 1, per_page: 500 }
}

export function dimensionRowKey(row: GoogleAdsDimension): string {
  if ('device' in row && row.device) return `${row.google_ads_account_id}|device|${row.device}`
  const geo = row as GoogleAdsGeoRow
  return [
    geo.google_ads_account_id,
    'geo',
    geo.country,
    geo.region ?? '',
    geo.city ?? '',
    geo.geo_id ?? '',
  ].join('|')
}

export function columnsInPreferenceOrder<T>(
  columns: TableColumnsType<T>,
  visibleKeys: readonly string[],
): TableColumnsType<T> {
  if (!visibleKeys.length) return columns.slice(0, 1)
  const byKey = new Map(columns.map((column) => [String(column.key), column]))
  return visibleKeys.flatMap((key) => {
    const column = byKey.get(key)
    return column ? [column] : []
  })
}

export function isDeviceRow(row: GoogleAdsDimension): row is GoogleAdsDeviceRow {
  return typeof row.device === 'string'
}
