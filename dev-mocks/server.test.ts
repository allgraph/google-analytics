import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import type {
  AnalyticsBreakdownDto,
  AnalyticsOverviewDto,
  BackendDataEnvelope,
  BackendListEnvelope,
  GoogleAdsAccount,
  GoogleAdsConnection,
  GoogleAdsDimensionDto,
  GoogleAdsEntityDto,
  GoogleAdsOAuthStart,
  GoogleAdsSyncJob,
} from '../src/api/types/index.js'
import { createMockDatabase } from './data.js'
import { createMockMiddleware } from './server.js'

const servers: Server[] = []
const anchor = new Date('2026-09-15T10:00:00Z')

async function start(scenario: Parameters<typeof createMockMiddleware>[0]) {
  const middleware = createMockMiddleware(scenario, anchor)
  const server = createServer((req, res) =>
    middleware(req, res, () => {
      res.writeHead(404)
      res.end()
    }),
  )
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  servers.push(server)
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Mock test server has no TCP address')
  return `http://127.0.0.1:${address.port}`
}

async function login(base: string) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      tenant_id: '00000000-0000-4001-8000-000000000001',
      email: 'administrator@local.mock',
      password: 'local-mock-only',
    }),
  })
  const payload = (await response.json()) as { data: { access_token: string } }
  return { Authorization: `Bearer ${payload.data.access_token}` }
}

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  )
})

describe('local Google Ads fixtures', () => {
  it('passes non-API routes through to Vite', async () => {
    const base = await start('full')
    const response = await fetch(base)
    expect(response.status).toBe(404)
    expect(response.headers.get('x-adcalltrack-data-source')).toBeNull()
  })

  it('generates ten accounts, a year of metrics and required edge cases', () => {
    const db = createMockDatabase(anchor)
    expect(db.accounts).toHaveLength(10)
    expect(db.dailyMetrics).toHaveLength(3650)
    expect(new Set(db.accounts.map((account) => account.currency_code))).toEqual(
      new Set(['EUR', 'CHF']),
    )
    expect(db.searchTerms.some((term) => term.privacy_restricted && term.name === null)).toBe(true)
    expect(db.dailyMetrics.some((metric) => metric.clicks === 0 && metric.cpa_minor === null)).toBe(
      true,
    )
    expect(new Set(db.accounts.map((account) => account.last_sync_status))).toEqual(
      new Set(['success', 'running', 'stale', 'failed']),
    )
  })

  it('supports authentication, account aggregation, filters and drill-down', async () => {
    const base = await start('full')
    const headers = await login(base)
    const accountsResponse = await fetch(`${base}/api/v1/ads-accounts?limit=100&offset=0`, {
      headers,
    })
    const accounts = (await accountsResponse.json()) as BackendListEnvelope<GoogleAdsAccount>
    expect(accounts.pagination?.total).toBe(10)

    const overviewResponse = await fetch(
      `${base}/api/v1/analytics/overview?from=2026-09-09&to=2026-09-15`,
      { headers },
    )
    const overview = (await overviewResponse.json()) as BackendDataEnvelope<AnalyticsOverviewDto>
    expect(overview.data.rows).toHaveLength(10)
    expect(overview.data.totals).toHaveLength(2)
    expect(overview.data.data_source).toBe('demo')
    expect(new Set(overview.data.totals.map((total) => total.currency_code))).toEqual(
      new Set(['EUR', 'CHF']),
    )
    for (const total of overview.data.totals) {
      expect(total.spend_minor).toBe(
        overview.data.rows
          .filter((row) => row.metrics.currency_code === total.currency_code)
          .reduce((sum, row) => sum + row.metrics.spend_minor, 0),
      )
    }
    for (const row of overview.data.rows) {
      expect(row.metrics.ctr).toBeCloseTo(row.metrics.clicks / row.metrics.impressions)
    }

    const entityResponse = await fetch(
      `${base}/api/v1/analytics/accounts/${accounts.data[0].id}/entities/campaigns?limit=2&offset=0&sort=clicks&order=desc`,
      { headers },
    )
    const entities = (await entityResponse.json()) as BackendListEnvelope<GoogleAdsEntityDto>
    expect(entities.data).toHaveLength(2)
    expect(entities.pagination?.total).toBe(3)

    const devicesResponse = await fetch(
      `${base}/api/v1/analytics/accounts/${accounts.data[0].id}/entities/devices?device=MOBILE`,
      { headers },
    )
    const devices = (await devicesResponse.json()) as BackendListEnvelope<GoogleAdsDimensionDto>
    expect(devices.data.every((row) => row.device === 'MOBILE')).toBe(true)

    const selectedIds = [accounts.data[0].id, accounts.data[8].id].join(',')
    const daily = (await (
      await fetch(
        `${base}/api/v1/analytics/breakdown?group_by=day&from=2026-09-15&to=2026-09-15&ads_account_ids=${selectedIds}`,
        { headers },
      )
    ).json()) as BackendDataEnvelope<AnalyticsBreakdownDto>
    expect(daily.data.rows).toHaveLength(2)
    expect(
      new Set(daily.data.rows.map((row) => ('currency_code' in row ? row.currency_code : ''))),
    ).toEqual(new Set(['EUR', 'CHF']))
  })

  it('supports OAuth, synchronization history and valid export formats', async () => {
    const base = await start('full')
    const headers = await login(base)
    const accounts = (await (
      await fetch(`${base}/api/v1/ads-accounts?limit=100`, { headers })
    ).json()) as BackendListEnvelope<GoogleAdsAccount>
    const disconnected = accounts.data.find(
      (account) => account.connection_status === 'disconnected',
    )!
    const oauth = (await (
      await fetch(`${base}/api/v1/google-ads/accounts/${disconnected.id}/oauth`, { headers })
    ).json()) as BackendDataEnvelope<GoogleAdsOAuthStart>
    const callback = await fetch(`${base}${oauth.data.authorization_url}`, { headers })
    expect(callback.ok).toBe(true)
    const connection = (await (
      await fetch(`${base}/api/v1/google-ads/accounts/${disconnected.id}/connection`, { headers })
    ).json()) as BackendDataEnvelope<GoogleAdsConnection>
    expect(connection.data.connected).toBe(true)
    const disconnect = await fetch(
      `${base}/api/v1/google-ads/accounts/${disconnected.id}/connection`,
      { method: 'DELETE', headers },
    )
    expect(disconnect.status).toBe(204)
    const disconnectedAgain = (await (
      await fetch(`${base}/api/v1/google-ads/accounts/${disconnected.id}/connection`, { headers })
    ).json()) as BackendDataEnvelope<GoogleAdsConnection>
    expect(disconnectedAgain.data.connected).toBe(false)
    expect(await fetch(`${base}${oauth.data.authorization_url}`, { headers })).toBeTruthy()

    const sync = await fetch(`${base}/api/v1/google-ads/accounts/${disconnected.id}/sync`, {
      method: 'POST',
      headers,
    })
    expect(sync.ok).toBe(true)
    const jobs = (await (
      await fetch(`${base}/api/v1/google-ads/sync-jobs?ads_account_id=${disconnected.id}`, {
        headers,
      })
    ).json()) as BackendListEnvelope<GoogleAdsSyncJob>
    expect(jobs.data.length).toBeGreaterThan(0)

    const csv = await fetch(`${base}/api/v1/analytics/export?format=csv`, { headers })
    expect(csv.headers.get('content-type')).toContain('text/csv')
    const xlsx = await fetch(`${base}/api/v1/analytics/export?format=xlsx`, { headers })
    expect(xlsx.headers.get('content-type')).toContain('spreadsheetml')
    const workbook = Buffer.from(await xlsx.arrayBuffer())
    expect(workbook.subarray(0, 2).toString()).toBe('PK')
    expect(workbook.includes(Buffer.from('[Content_Types].xml'))).toBe(true)
    expect(workbook.includes(Buffer.from('xl/worksheets/sheet1.xml'))).toBe(true)
  })

  it('provides isolated empty and error scenarios without fallback', async () => {
    const emptyBase = await start('empty')
    const emptyHeaders = await login(emptyBase)
    const empty = (await (
      await fetch(`${emptyBase}/api/v1/ads-accounts`, { headers: emptyHeaders })
    ).json()) as BackendListEnvelope<GoogleAdsAccount>
    expect(empty.data).toEqual([])

    const limitedBase = await start('rate-limit')
    const limitedHeaders = await login(limitedBase)
    const limited = await fetch(`${limitedBase}/api/v1/analytics/overview`, {
      headers: limitedHeaders,
    })
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBe('2')
  })

  it.each([
    ['oauth-expired', 'disconnected', 'LOCAL MOCK: OAuth expired'],
    ['sync-error', undefined, 'LOCAL MOCK: synchronization failed'],
  ] as const)('applies the %s account state consistently', async (scenario, connection, error) => {
    const base = await start(scenario)
    const headers = await login(base)
    const payload = (await (
      await fetch(`${base}/api/v1/ads-accounts?limit=100`, { headers })
    ).json()) as BackendListEnvelope<GoogleAdsAccount>
    expect(payload.data.every((account) => account.last_sync_error === error)).toBe(true)
    if (connection)
      expect(payload.data.every((account) => account.connection_status === connection)).toBe(true)
    else expect(payload.data.every((account) => account.last_sync_status === 'failed')).toBe(true)
  })

  it('returns explicit authentication and server errors without data fallback', async () => {
    const base = await start('full')
    const badLogin = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant_id: 'wrong', email: 'wrong', password: 'wrong' }),
    })
    expect(badLogin.status).toBe(401)

    const failedBase = await start('server-error')
    const headers = await login(failedBase)
    const failed = await fetch(`${failedBase}/api/v1/analytics/overview`, { headers })
    expect(failed.status).toBe(500)
    const payload = (await failed.json()) as { error: { code: string } }
    expect(payload.error.code).toBe('INTERNAL_ERROR')
  })
})
