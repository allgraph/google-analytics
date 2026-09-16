import { describe, expect, it, vi } from 'vitest'
import type { UrlFiltersApi } from './useUrlFilters'
import {
  accountIdsFromUrl,
  accountIdsToUrl,
  exportRequestFromUrl,
  NO_ACCOUNTS,
} from './googleAdsUrlState'

describe('Google Ads URL state', () => {
  it('uses absence for all accounts and a comma separated value for a subset', () => {
    const available = ['one', 'two', 'three']
    expect(accountIdsFromUrl({}, available)).toEqual(available)
    expect(accountIdsToUrl(available, available)).toBeNull()
    expect(accountIdsToUrl(['one', 'three'], available)).toBe('one,three')
    expect(accountIdsFromUrl({ ads_account_ids: 'one,three' }, available)).toEqual(['one', 'three'])
    expect(accountIdsFromUrl({ ads_account_ids: NO_ACCOUNTS }, available)).toEqual([])
  })

  it('builds export from the same dates, accounts, filters and sorting as the table', () => {
    const filters = {
      page: 4,
      perPage: 50,
      sort: 'spend',
      order: 'desc',
      period: 'custom',
      filters: {},
      toQueryParams: () => ({
        page: 4,
        per_page: 50,
        from: '2026-08-01',
        to: '2026-09-15',
        ads_account_ids: 'one,three',
        campaign_id: 'campaign-7',
        status: 'enabled',
        sort: 'spend',
        order: 'desc',
      }),
      setFilter: vi.fn(),
      setFilters: vi.fn(),
      setPeriod: vi.fn(),
      setPage: vi.fn(),
      setPerPage: vi.fn(),
      setSort: vi.fn(),
      reset: vi.fn(),
    } as UrlFiltersApi

    expect(exportRequestFromUrl(filters, 'ad_group', ['name', 'spend'], 'xlsx')).toEqual({
      format: 'xlsx',
      group_by: 'ad_group',
      columns: ['name', 'spend'],
      from: '2026-08-01',
      to: '2026-09-15',
      ads_account_ids: ['one', 'three'],
      campaign_id: 'campaign-7',
      status: 'enabled',
      sort: 'spend',
      order: 'desc',
    })
  })
})
