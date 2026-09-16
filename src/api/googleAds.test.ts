import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFileRequest, apiConfig, apiRequest, contentDispositionFileName } from '../services/api'
import {
  normalizeAdvertisingMetrics,
  normalizeAnalyticsBreakdown,
  normalizeAnalyticsOverview,
  parseErrorEnvelope,
  parseSuccessEnvelope,
  withApiQuery,
} from './adapters'
import { advertisingInvalidationKeys, syncInvalidationKeys } from './mutations'
import { apiRoutes } from './routes'
import type { AdvertisingMetricsDto, AnalyticsBreakdownDto, AnalyticsOverviewDto } from './types'

const metrics = (currency_code = 'EUR'): AdvertisingMetricsDto => ({
  currency_code,
  spend_minor: 12_345,
  impressions: 1_000,
  clicks: 0,
  ctr: null,
  average_cpc_minor: null,
  conversions: 0,
  conversion_rate: null,
  cpa_minor: null,
  conversion_value_minor: 0,
  roas: null,
})

function installBrowserTransport(response: Response) {
  Object.assign(apiConfig, { baseUrl: '/api/v1' })
  vi.stubGlobal('window', {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  })
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('Google Ads routes and query parameters', () => {
  it('builds and escapes account and entity paths', () => {
    expect(apiRoutes.adsAccounts.detail('account/one')).toBe('/ads-accounts/account%2Fone')
    expect(apiRoutes.googleAds.oauth('account one')).toBe(
      '/google-ads/accounts/account%20one/oauth',
    )
    expect(apiRoutes.analytics.entities('account/one', 'search-terms')).toBe(
      '/analytics/accounts/account%2Fone/entities/search-terms',
    )
  })

  it('converts pagination and serializes backend CSV parameters once', () => {
    const path = withApiQuery('/analytics/breakdown', {
      page: 2,
      per_page: 25,
      ads_account_ids: ['first', 'second'],
      columns: ['spend', 'clicks'],
      from: '2026-09-01',
      empty: '',
      omitted: null,
    })
    const url = new URL(path, 'https://example.test')

    expect(url.searchParams.get('limit')).toBe('25')
    expect(url.searchParams.get('offset')).toBe('25')
    expect(url.searchParams.getAll('ads_account_ids')).toEqual(['first,second'])
    expect(url.searchParams.getAll('columns')).toEqual(['spend,clicks'])
    expect(url.searchParams.get('from')).toBe('2026-09-01')
    expect(url.searchParams.has('empty')).toBe(false)
    expect(url.searchParams.has('omitted')).toBe(false)
  })
})

describe('advertising metric adapters', () => {
  it('converts minor units and preserves zero values and nullable ratios', () => {
    expect(normalizeAdvertisingMetrics(metrics())).toEqual({
      spend: { amount: '123.45', currency: 'EUR' },
      impressions: 1_000,
      clicks: 0,
      ctr: null,
      average_cpc: null,
      conversions: 0,
      conversion_rate: null,
      cpa: null,
      conversion_value: { amount: '0.00', currency: 'EUR' },
      roas: null,
    })
  })

  it('keeps overview totals separated by currency', () => {
    const source: AnalyticsOverviewDto = {
      from: '2026-09-01',
      to: '2026-09-15',
      data_source: 'demo',
      rows: [
        { google_ads_account_id: 'one', account_name: 'One', metrics: metrics('EUR') },
        { google_ads_account_id: 'two', account_name: 'Two', metrics: metrics('CHF') },
      ],
      totals: [metrics('EUR'), metrics('CHF')],
    }

    const result = normalizeAnalyticsOverview(source)
    expect(result.totals.map((total) => total.spend.currency)).toEqual(['EUR', 'CHF'])
    expect(result.rows[1].metrics.spend).toEqual({ amount: '123.45', currency: 'CHF' })
  })

  it('accepts a successful empty overview without optional totals metadata', () => {
    const result = normalizeAnalyticsOverview({
      from: '2026-08-18T00:00:00Z',
      to: '2026-09-17T00:00:00Z',
      rows: [],
    })

    expect(result).toMatchObject({ rows: [], totals: [], data_source: 'unverified' })
  })

  it('normalizes metrics and nested offset pagination in breakdowns', () => {
    const source: AnalyticsBreakdownDto = {
      from: '2026-09-01',
      to: '2026-09-15',
      group_by: 'day',
      data_source: 'demo',
      rows: [{ date: '2026-09-02', currency_code: 'EUR', metrics: metrics() }],
      pagination: { limit: 1, offset: 1, total: 3 },
    }

    const result = normalizeAnalyticsBreakdown(source)
    expect(result.rows[0].metrics.cpa).toBeNull()
    expect(result.pagination).toMatchObject({ page: 2, per_page: 1, total: 3, from: 2, to: 2 })
  })
})

describe('envelopes, files and mutation invalidation', () => {
  it('normalizes ordinary list and error envelopes', () => {
    expect(
      parseSuccessEnvelope({
        data: [{ id: 'one' }],
        pagination: { limit: 20, offset: 20, total: 41 },
      }),
    ).toEqual({
      data: [{ id: 'one' }],
      meta: { hidden_fields: [], page: 2, per_page: 20, total: 41, from: 21, to: 21 },
    })
    expect(
      parseErrorEnvelope({ error: { code: 'INVALID', message: 'Bad', request_id: 'request-1' } }),
    ).toEqual({
      error: { code: 'INVALID', message: 'Bad', request_id: 'request-1', field_errors: {} },
    })
    expect(
      parseErrorEnvelope(
        { error: { code: 'INVALID', message: 'Bad', field_errors: { name: ['Required'] } } },
        'header-id',
      ).error,
    ).toMatchObject({ request_id: 'header-id', field_errors: { name: ['Required'] } })
  })

  it('extracts regular and RFC 5987 export filenames', () => {
    expect(contentDispositionFileName('attachment; filename="report.csv"')).toBe('report.csv')
    expect(contentDispositionFileName("attachment; filename*=UTF-8''Google%20Ads.xlsx")).toBe(
      'Google Ads.xlsx',
    )
    expect(contentDispositionFileName(null)).toBeNull()
  })

  it('downloads a binary export through the authenticated transport', async () => {
    const fetchMock = installBrowserTransport(
      new Response('account,spend\nOne,12345', {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="google-ads.csv"',
        },
      }),
    )

    const file = await apiFileRequest('/analytics/export?format=csv')
    expect(file.fileName).toBe('google-ads.csv')
    expect(file.contentType).toContain('text/csv')
    expect(await file.blob.text()).toContain('One,12345')
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(new Headers(request.headers).get('accept')).toBe('*/*')
  })

  it('handles 204 and binary API errors through the common envelope parser', async () => {
    installBrowserTransport(new Response(null, { status: 204 }))
    await expect(apiRequest('/ads-accounts/account-1', { method: 'DELETE' })).resolves.toEqual({
      data: undefined,
      meta: { hidden_fields: [] },
    })

    installBrowserTransport(
      Response.json(
        { error: { code: 'RATE_LIMITED', message: 'Wait', request_id: 'request-429' } },
        { status: 429, headers: { 'retry-after': '2' } },
      ),
    )
    await expect(apiFileRequest('/analytics/export?format=xlsx')).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      requestId: 'request-429',
      retryAfterMs: 2_000,
    })
  })

  it.each([403, 422, 500])('normalizes HTTP %s without a data fallback', async (status) => {
    installBrowserTransport(
      Response.json(
        {
          error: {
            code: `ERROR_${status}`,
            message: 'Request failed',
            request_id: `request-${status}`,
            field_errors: status === 422 ? { name: ['Required'] } : {},
          },
        },
        { status },
      ),
    )

    await expect(apiRequest('/ads-accounts')).rejects.toMatchObject({
      status,
      code: `ERROR_${status}`,
      requestId: `request-${status}`,
      fieldErrors: status === 422 ? { name: ['Required'] } : {},
    })
  })

  it('invalidates account data precisely and adds sync history for sync writes', () => {
    expect(advertisingInvalidationKeys('account-1')).toEqual([
      ['ads-accounts'],
      ['analytics-overview'],
      ['analytics-breakdown'],
      ['google-ads-entities'],
      ['ads-accounts', 'detail', 'account-1'],
      ['google-ads-connections', 'detail', 'account-1'],
    ])
    expect(advertisingInvalidationKeys()).not.toContainEqual([
      'google-ads-connections',
      'detail',
      'account-1',
    ])
    expect(syncInvalidationKeys('account-1')).toContainEqual(['google-ads-sync-jobs'])
    expect(syncInvalidationKeys('account-1')).toContainEqual(['google-ads-sync-errors'])
  })
})
