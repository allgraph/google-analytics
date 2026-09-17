import type { ColumnsType } from 'antd/es/table'
import { describe, expect, it } from 'vitest'
import type { GoogleAdsGeoRow } from '../api/types'
import type { UrlFiltersApi } from '../lib/useUrlFilters'
import {
  columnsInPreferenceOrder,
  dimensionQueryFromUrl,
  dimensionReferenceQueryFromUrl,
  dimensionRowKey,
} from './googleAdsDimensionPage'

function filters(query: Record<string, string | number>): UrlFiltersApi {
  return {
    page: Number(query.page ?? 1),
    perPage: Number(query.per_page ?? 10),
    sort: typeof query.sort === 'string' ? query.sort : undefined,
    order: query.order === 'asc' ? 'asc' : query.order === 'desc' ? 'desc' : undefined,
    period: 'last30',
    filters: Object.fromEntries(
      Object.entries(query)
        .filter(([, value]) => typeof value === 'string')
        .map(([key, value]) => [key, String(value)]),
    ),
    setFilter: () => undefined,
    setFilters: () => undefined,
    setPeriod: () => undefined,
    setPage: () => undefined,
    setPerPage: () => undefined,
    setSort: () => undefined,
    reset: () => undefined,
    toQueryParams: () => ({ page: 1, per_page: 10, ...query }),
  }
}

describe('Google Ads dimension query state', () => {
  it('keeps period, hierarchy, dimension filters, pagination and sorting', () => {
    const result = dimensionQueryFromUrl(
      filters({
        page: 3,
        per_page: 50,
        from: '2026-09-01',
        to: '2026-09-15',
        campaign_id: '1001',
        ad_group_id: '10011',
        device: 'MOBILE',
        country: 'DE',
        sort: 'clicks',
        order: 'asc',
        q: 'must-not-reach-api',
      }),
      'devices',
    )

    expect(result).toEqual({
      page: 3,
      per_page: 50,
      from: '2026-09-01',
      to: '2026-09-15',
      campaign_id: '1001',
      ad_group_id: '10011',
      device: 'MOBILE',
      sort: 'clicks',
      order: 'asc',
    })
  })

  it('does not leak filters from the other dimension page into the request', () => {
    const state = filters({ device: 'MOBILE', country: 'DE', region: 'Berlin' })
    expect(dimensionQueryFromUrl(state, 'devices')).toMatchObject({ device: 'MOBILE' })
    expect(dimensionQueryFromUrl(state, 'devices')).not.toHaveProperty('country')
    expect(dimensionQueryFromUrl(state, 'geography')).toMatchObject({
      country: 'DE',
      region: 'Berlin',
    })
    expect(dimensionQueryFromUrl(state, 'geography')).not.toHaveProperty('device')
  })

  it('removes dimension filters and sorting from reference requests', () => {
    const result = dimensionReferenceQueryFromUrl(
      filters({
        from: '2026-09-01',
        campaign_id: '1001',
        country: 'DE',
        region: 'Berlin',
        device: 'DESKTOP',
        sort: 'spend',
        order: 'desc',
      }),
    )

    expect(result).toEqual({
      page: 1,
      per_page: 500,
      from: '2026-09-01',
      campaign_id: '1001',
    })
  })

  it('creates a stable key even when optional geography fields are null', () => {
    const row = {
      google_ads_account_id: 'account-1',
      country: 'DE',
      region: null,
      city: null,
      geo_id: null,
    } as GoogleAdsGeoRow

    expect(dimensionRowKey(row)).toBe('account-1|geo|DE|||')
  })

  it('applies saved visibility and order to table columns', () => {
    const columns: ColumnsType<{ value: string }> = [
      { key: 'one', title: 'One' },
      { key: 'two', title: 'Two' },
      { key: 'three', title: 'Three' },
    ]
    expect(columnsInPreferenceOrder(columns, ['three', 'one']).map((column) => column.key)).toEqual(
      ['three', 'one'],
    )
  })
})
