import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import type {
  AdvertisingMetricsDto,
  AnalyticsOverviewDto,
  GoogleAdsDimensionDto,
  GoogleAdsEntityDto,
} from '../src/api/types/index.js'
import {
  createMockDatabase,
  MOCK_SENTINEL,
  sumMetrics,
  type MockAccount,
  type MockDatabase,
  type MockEntity,
  type MockMetrics,
  type MockScenario,
} from './data.js'

const ACCESS_TOKEN = 'local-mock-access-token'
const REFRESH_TOKEN = 'local-mock-refresh-token'
const MOCK_EMAIL = 'administrator@local.mock'
const MOCK_PASSWORD = 'local-mock-only'

interface MockResponse {
  status?: number
  body?: unknown
  headers?: Record<string, string>
  buffer?: Buffer
}

function jsonError(status: number, code: string, message: string): MockResponse {
  return {
    status,
    body: { error: { code, message, field_errors: {}, request_id: `mock-${status}` } },
  }
}

async function requestBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
  } catch {
    return {}
  }
}

function selectedAccountIds(url: URL, db: MockDatabase): string[] {
  const one = url.searchParams.get('ads_account_id')
  const many = url.searchParams.get('ads_account_ids')?.split(',').filter(Boolean)
  return one ? [one] : many?.length ? many : db.accounts.map((account) => account.id)
}

function dateRange(url: URL, db: MockDatabase): { from: string; to: string } {
  const today = db.dailyMetrics.at(-1)?.date ?? new Date().toISOString().slice(0, 10)
  const from = url.searchParams.get('from') ?? today
  const to = url.searchParams.get('to') ?? today
  return { from, to }
}

function metricsFor(
  url: URL,
  db: MockDatabase,
  accountIds = selectedAccountIds(url, db),
): MockMetrics {
  const { from, to } = dateRange(url, db)
  return sumMetrics(
    db.dailyMetrics.filter(
      (row) => accountIds.includes(row.google_ads_account_id) && row.date >= from && row.date <= to,
    ),
  )
}

function metricsWithCurrency(
  metrics: MockMetrics,
  currencyCode: string,
): AdvertisingMetricsDto & { data_source: 'demo' } {
  return { ...metrics, currency_code: currencyCode, data_source: 'demo' }
}

function listResponse<T>(items: T[], url: URL): MockResponse {
  const limit = Math.max(1, Number(url.searchParams.get('limit') ?? 100))
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0))
  const sort = url.searchParams.get('sort')
  const direction = url.searchParams.get('order') === 'asc' ? 1 : -1
  const metricSortAliases: Record<string, string> = {
    spend: 'spend_minor',
    average_cpc: 'average_cpc_minor',
    cpa: 'cpa_minor',
    conversion_value: 'conversion_value_minor',
  }
  const sorted = sort
    ? [...items].sort((left, right) => {
        const value = (item: T): unknown => {
          const row = item as Record<string, unknown>
          const metrics = row.metrics as Record<string, unknown> | undefined
          return row[sort] ?? metrics?.[metricSortAliases[sort] ?? sort]
        }
        const leftValue = value(left)
        const rightValue = value(right)
        if (typeof leftValue === 'string' || typeof rightValue === 'string') {
          return String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'ru') * direction
        }
        return (Number(leftValue ?? 0) - Number(rightValue ?? 0)) * direction
      })
    : items
  return {
    body: {
      data: sorted.slice(offset, offset + limit),
      pagination: { limit, offset, total: sorted.length },
    },
  }
}

function entityRows(entities: MockEntity[], url: URL, db: MockDatabase): GoogleAdsEntityDto[] {
  const accountIds = selectedAccountIds(url, db)
  return entities
    .filter((entity) => accountIds.includes(entity.google_ads_account_id))
    .filter(
      (entity) =>
        !url.searchParams.get('campaign_id') ||
        entity.campaign_id === url.searchParams.get('campaign_id'),
    )
    .filter(
      (entity) =>
        !url.searchParams.get('ad_group_id') ||
        entity.ad_group_id === url.searchParams.get('ad_group_id'),
    )
    .filter(
      (entity) => !url.searchParams.get('ad_id') || entity.ad_id === url.searchParams.get('ad_id'),
    )
    .filter(
      (entity) =>
        !url.searchParams.get('keyword') ||
        entity.keyword_id === url.searchParams.get('keyword') ||
        entity.name?.includes(url.searchParams.get('keyword')!),
    )
    .filter(
      (entity) =>
        !url.searchParams.get('search_term') ||
        entity.name?.includes(url.searchParams.get('search_term')!),
    )
    .filter(
      (entity) =>
        !url.searchParams.get('match_type') ||
        entity.match_type === url.searchParams.get('match_type'),
    )
    .filter(
      (entity) =>
        !url.searchParams.get('status') || entity.status === url.searchParams.get('status'),
    )
    .map(({ metrics_weight: weight, ...entity }) => {
      const account = db.accounts.find(
        (candidate) => candidate.id === entity.google_ads_account_id,
      )!
      const total = metricsFor(url, db, [entity.google_ads_account_id])
      const scaled = scaleMetrics(total, weight)
      return {
        ...entity,
        metrics: metricsWithCurrency(scaled, account.currency_code),
        data_source: 'demo',
      }
    })
}

function dimensionRows(groupBy: string, url: URL, db: MockDatabase): GoogleAdsDimensionDto[] {
  const ids = selectedAccountIds(url, db)
  const definitions: Array<{
    weight: number
    device?: string
    country?: string
    region?: string
    city?: string
    geo_id?: string
  }> =
    groupBy === 'device'
      ? [
          { device: 'DESKTOP', weight: 0.42 },
          { device: 'MOBILE', weight: 0.48 },
          { device: 'TABLET', weight: 0.08 },
          { device: 'OTHER', weight: 0.02 },
        ]
      : [
          { country: 'DE', region: 'Berlin', city: 'Berlin', geo_id: '1003854', weight: 0.5 },
          { country: 'DE', region: 'Bayern', city: 'München', geo_id: '1004434', weight: 0.25 },
          { country: 'AT', region: 'Wien', city: 'Wien', geo_id: '1000997', weight: 0.15 },
          { country: 'CH', region: 'Zürich', city: 'Zürich', geo_id: '1003297', weight: 0.1 },
        ]
  return db.accounts
    .filter((account) => ids.includes(account.id))
    .flatMap((account) =>
      definitions
        .filter(
          (definition) =>
            !url.searchParams.get('device') || definition.device === url.searchParams.get('device'),
        )
        .filter(
          (definition) =>
            !url.searchParams.get('country') ||
            definition.country === url.searchParams.get('country'),
        )
        .filter(
          (definition) =>
            !url.searchParams.get('city') || definition.city === url.searchParams.get('city'),
        )
        .map(({ weight, ...definition }) => {
          const total = metricsFor(url, db, [account.id])
          const scaled = scaleMetrics(total, weight)
          return {
            google_ads_account_id: account.id,
            ...definition,
            metrics: metricsWithCurrency(scaled, account.currency_code),
            data_source: 'demo',
          }
        }),
    )
}

/** Keep scaled entity fixtures inside the wire contract: minor units and click counts are integers. */
function scaleMetrics(metrics: MockMetrics, weight: number): MockMetrics {
  const spendMinor = Math.round(metrics.spend_minor * weight)
  const impressions = Math.round(metrics.impressions * weight)
  const clicks = Math.round(metrics.clicks * weight)
  const conversions = Math.round(metrics.conversions * weight * 10_000) / 10_000
  const conversionValueMinor = Math.round(metrics.conversion_value_minor * weight)

  return {
    spend_minor: spendMinor,
    impressions,
    clicks,
    ctr: impressions === 0 ? null : clicks / impressions,
    average_cpc_minor: clicks === 0 ? null : Math.round(spendMinor / clicks),
    conversions,
    conversion_rate: clicks === 0 ? null : conversions / clicks,
    cpa_minor: conversions === 0 ? null : Math.round(spendMinor / conversions),
    conversion_value_minor: conversionValueMinor,
    roas: spendMinor === 0 ? null : conversionValueMinor / spendMinor,
  }
}

function overview(url: URL, db: MockDatabase): MockResponse {
  const { from, to } = dateRange(url, db)
  const ids = selectedAccountIds(url, db)
  const rows = db.accounts
    .filter((account) => ids.includes(account.id))
    .map((account) => ({
      google_ads_account_id: account.id,
      account_name: account.name,
      metrics: metricsWithCurrency(metricsFor(url, db, [account.id]), account.currency_code),
    }))
  const currencies = [...new Set(rows.map((row) => row.metrics.currency_code))]
  const totals = currencies.map((currency) => ({
    currency_code: currency,
    ...sumMetrics(
      rows.filter((row) => row.metrics.currency_code === currency).map((row) => row.metrics),
    ),
  }))
  const data: AnalyticsOverviewDto = { from, to, data_source: 'demo', rows, totals }
  return { body: { data } }
}

function breakdown(url: URL, db: MockDatabase): MockResponse {
  const groupBy = url.searchParams.get('group_by') ?? 'account'
  const { from, to } = dateRange(url, db)
  let rows: unknown[]
  if (groupBy === 'account') {
    rows = (overview(url, db).body as { data: { rows: unknown[] } }).data.rows
  } else if (groupBy === 'day') {
    const ids = selectedAccountIds(url, db)
    const currencies = [
      ...new Set(
        db.accounts
          .filter((account) => ids.includes(account.id))
          .map((account) => account.currency_code),
      ),
    ]
    rows = [
      ...new Set(
        db.dailyMetrics
          .filter(
            (row) => ids.includes(row.google_ads_account_id) && row.date >= from && row.date <= to,
          )
          .map((row) => row.date),
      ),
    ]
      .sort()
      .flatMap((date) =>
        currencies.map((currency) => ({
          date,
          currency_code: currency,
          metrics: metricsWithCurrency(
            sumMetrics(
              db.dailyMetrics.filter(
                (row) =>
                  row.date === date &&
                  ids.includes(row.google_ads_account_id) &&
                  db.accounts.find((account) => account.id === row.google_ads_account_id)
                    ?.currency_code === currency,
              ),
            ),
            currency,
          ),
        })),
      )
  } else if (['device', 'country', 'region', 'city', 'geography'].includes(groupBy)) {
    rows = dimensionRows(groupBy, url, db)
  } else {
    const source =
      groupBy === 'campaign'
        ? db.campaigns
        : groupBy === 'ad_group'
          ? db.adGroups
          : groupBy === 'ad'
            ? db.ads
            : groupBy === 'keyword'
              ? db.keywords
              : groupBy === 'search_term'
                ? db.searchTerms
                : []
    rows = entityRows(source, url, db)
  }
  const limit = Math.max(1, Number(url.searchParams.get('limit') ?? 100))
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0))
  const sorted = (listResponse(rows, url).body as { data: unknown[] }).data
  return {
    body: {
      data: {
        from,
        to,
        group_by: groupBy,
        data_source: 'demo',
        rows: sorted,
        pagination: { limit, offset, total: rows.length },
      },
    },
  }
}

async function exportResponse(url: URL, db: MockDatabase): Promise<MockResponse> {
  const format = url.searchParams.get('format') ?? 'csv'
  const data = (
    overview(url, db).body as {
      data: {
        rows: Array<{ account_name: string; metrics: MockMetrics & { currency_code: string } }>
      }
    }
  ).data.rows
  const table = data.map((row) => ({
    account: row.account_name,
    currency: row.metrics.currency_code,
    spend_minor: row.metrics.spend_minor,
    impressions: row.metrics.impressions,
    clicks: row.metrics.clicks,
    conversions: row.metrics.conversions,
  }))
  if (format === 'xlsx') {
    return {
      buffer: createXlsx(table),
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': 'attachment; filename="google-ads-local-mock.xlsx"',
      },
    }
  }
  const headers = Object.keys(table[0] ?? { account: '', currency: '' })
  const csv = [
    headers.join(','),
    ...table.map((row) =>
      headers.map((key) => JSON.stringify(String(row[key as keyof typeof row] ?? ''))).join(','),
    ),
  ].join('\n')
  return {
    buffer: Buffer.from(csv),
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="google-ads-local-mock.csv"',
    },
  }
}

function xml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function columnName(index: number): string {
  let value = index + 1
  let name = ''
  while (value > 0) {
    value -= 1
    name = String.fromCharCode(65 + (value % 26)) + name
    value = Math.floor(value / 26)
  }
  return name
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zip(files: Array<{ name: string; content: string }>): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name)
    const content = Buffer.from(file.content)
    const checksum = crc32(content)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(content.length, 18)
    local.writeUInt32LE(content.length, 22)
    local.writeUInt16LE(name.length, 26)
    localParts.push(local, name, content)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(content.length, 20)
    central.writeUInt32LE(content.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)
    offset += local.length + name.length + content.length
  }
  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...localParts, centralDirectory, end])
}

function createXlsx(rows: Array<Record<string, string | number>>): Buffer {
  const headers = Object.keys(rows[0] ?? { account: '' })
  const values: Array<Array<string | number>> = [
    headers,
    ...rows.map((row) => headers.map((key) => row[key] ?? '')),
  ]
  const sheetRows = values
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const reference = `${columnName(columnIndex)}${rowIndex + 1}`
          return typeof value === 'number'
            ? `<c r="${reference}"><v>${value}</v></c>`
            : `<c r="${reference}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`
        })
        .join('')
      return `<row r="${rowIndex + 1}">${cells}</row>`
    })
    .join('')
  return zip([
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Google Ads" sheetId="1" r:id="rId1"/></sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
    },
  ])
}

export function createMockHandler(scenario: MockScenario, anchor = new Date()) {
  const db = createMockDatabase(anchor)
  if (scenario === 'empty') {
    db.accounts = []
    db.campaigns = []
    db.adGroups = []
    db.ads = []
    db.keywords = []
    db.searchTerms = []
    db.dailyMetrics = []
    db.syncJobs = []
  }
  if (scenario === 'oauth-expired')
    db.accounts.forEach((account) => {
      account.connection_status = 'disconnected'
      account.last_sync_error = 'LOCAL MOCK: OAuth expired'
    })
  if (scenario === 'sync-error')
    db.accounts.forEach((account) => {
      account.last_sync_status = 'failed'
      account.last_sync_error = 'LOCAL MOCK: synchronization failed'
    })

  return async (req: IncomingMessage): Promise<MockResponse | undefined> => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    if (url.pathname !== '/api/v1' && !url.pathname.startsWith('/api/v1/')) return undefined
    const path = url.pathname.replace(/^\/api\/v1/, '')
    const method = req.method ?? 'GET'
    if (scenario === 'rate-limit' && !path.startsWith('/auth/'))
      return {
        ...jsonError(429, 'RATE_LIMITED', 'LOCAL MOCK: rate limit exceeded'),
        headers: { 'content-type': 'application/json; charset=utf-8', 'retry-after': '2' },
      }
    if (scenario === 'server-error' && !path.startsWith('/auth/'))
      return jsonError(500, 'INTERNAL_ERROR', 'LOCAL MOCK: server error')

    if (path === '/auth/login' && method === 'POST') {
      const body = await requestBody(req)
      if (
        body.email !== MOCK_EMAIL ||
        body.password !== MOCK_PASSWORD ||
        body.tenant_id !== db.tenantId
      )
        return jsonError(401, 'AUTHENTICATION_FAILED', 'authentication failed')
      const expires = new Date(Date.now() + 3_600_000).toISOString()
      return {
        body: {
          data: {
            user_id: db.userId,
            tenant_id: db.tenantId,
            role: 'owner',
            token_type: 'Bearer',
            access_token: ACCESS_TOKEN,
            access_expires_at: expires,
            refresh_token: REFRESH_TOKEN,
            refresh_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          },
        },
      }
    }
    if (path === '/auth/refresh' && method === 'POST')
      return {
        body: {
          data: {
            user_id: db.userId,
            tenant_id: db.tenantId,
            role: 'owner',
            token_type: 'Bearer',
            access_token: ACCESS_TOKEN,
            access_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
            refresh_token: REFRESH_TOKEN,
            refresh_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          },
        },
      }
    if (path === '/auth/logout' || path === '/auth/logout-all') return { body: { data: null } }

    if (req.headers.authorization !== `Bearer ${ACCESS_TOKEN}`)
      return jsonError(401, 'AUTHENTICATION_REQUIRED', 'authentication required')
    if (path === '/auth/me')
      return {
        body: {
          data: {
            user_id: db.userId,
            tenant_id: db.tenantId,
            membership_id: db.membershipId,
            role: 'owner',
            site_ids: null,
            project_ids: null,
            issued_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3_600_000).toISOString(),
          },
        },
      }

    if (path === '/ads-accounts' && method === 'GET') return listResponse(db.accounts, url)
    if (path === '/ads-accounts' && method === 'POST') {
      const body = await requestBody(req)
      const now = new Date().toISOString()
      const account: MockAccount = {
        data_source: 'demo',
        id: `local-${db.accounts.length + 1}`,
        tenant_id: db.tenantId,
        name: String(body.name ?? 'New local account'),
        google_ads_customer_id: String(body.google_ads_customer_id ?? ''),
        currency_code: body.currency_code === 'CHF' ? 'CHF' : 'EUR',
        country_code: body.country_code === 'CH' ? 'CH' : body.country_code === 'AT' ? 'AT' : 'DE',
        timezone: 'Europe/Berlin',
        status: 'active',
        connection_status: 'disconnected',
        connected_at: null,
        last_sync_at: null,
        last_sync_status: null,
        last_sync_error: null,
        created_at: now,
        updated_at: now,
      }
      db.accounts.push(account)
      return { status: 201, body: { data: account } }
    }
    const accountMatch = /^\/ads-accounts\/([^/]+)$/.exec(path)
    if (accountMatch) {
      const index = db.accounts.findIndex((account) => account.id === accountMatch[1])
      if (index < 0) return jsonError(404, 'NOT_FOUND', 'account not found')
      if (method === 'GET') return { body: { data: db.accounts[index] } }
      if (method === 'DELETE') {
        db.accounts.splice(index, 1)
        return { status: 204 }
      }
      if (method === 'PUT' || method === 'PATCH') {
        Object.assign(db.accounts[index], await requestBody(req), {
          updated_at: new Date().toISOString(),
        })
        return { body: { data: db.accounts[index] } }
      }
    }

    const connectionMatch = /^\/google-ads\/accounts\/([^/]+)\/connection$/.exec(path)
    if (connectionMatch) {
      const account = db.accounts.find((candidate) => candidate.id === connectionMatch[1])
      if (!account) return jsonError(404, 'NOT_FOUND', 'account not found')
      if (method === 'DELETE') {
        account.connection_status = 'disconnected'
        account.connected_at = null
        return { status: 204 }
      }
      return {
        body: {
          data: {
            ads_account_id: account.id,
            connected: account.connection_status === 'connected',
            status: account.connection_status,
          },
        },
      }
    }
    const grantMatch = /^\/google-ads\/accounts\/([^/]+)\/grant$/.exec(path)
    if (grantMatch && method === 'DELETE') {
      const account = db.accounts.find((candidate) => candidate.id === grantMatch[1])
      if (!account) return jsonError(404, 'NOT_FOUND', 'account not found')
      account.connection_status = 'disconnected'
      account.connected_at = null
      account.last_sync_status = 'failed'
      account.last_sync_error = 'LOCAL MOCK: Google OAuth grant revoked'
      account.updated_at = new Date().toISOString()
      return { status: 204 }
    }
    const oauthMatch = /^\/google-ads\/accounts\/([^/]+)\/oauth$/.exec(path)
    if (oauthMatch)
      return {
        body: {
          data: {
            authorization_url: `/api/v1/google-ads/oauth/callback?state=${encodeURIComponent(oauthMatch[1])}&code=local-mock-code`,
          },
        },
      }
    if (path === '/google-ads/oauth/callback') {
      const account = db.accounts.find(
        (candidate) => candidate.id === url.searchParams.get('state'),
      )
      if (!account || !url.searchParams.get('code'))
        return jsonError(400, 'INVALID_OAUTH_STATE', 'invalid local mock OAuth callback')
      account.connection_status = 'connected'
      account.connected_at = new Date().toISOString()
      account.status = 'active'
      account.last_sync_error = null
      account.updated_at = new Date().toISOString()
      return { body: { data: { connected: true, ads_account_id: account.id } } }
    }
    const resourcesMatch = /^\/google-ads\/accounts\/([^/]+)\/resources\/([^/]+)$/.exec(path)
    if (resourcesMatch) {
      const account = db.accounts.find((candidate) => candidate.id === resourcesMatch[1])
      if (!account) return jsonError(404, 'NOT_FOUND', 'account not found')
      const resource = resourcesMatch[2]
      url.searchParams.set('ads_account_id', account.id)
      const results =
        resource === 'customer'
          ? [
              {
                customer: {
                  id: account.google_ads_customer_id,
                  descriptive_name: account.name,
                  currency_code: account.currency_code,
                  time_zone: account.timezone,
                },
              },
            ]
          : resource === 'campaigns'
            ? entityRows(db.campaigns, url, db)
            : resource === 'ad-groups'
              ? entityRows(db.adGroups, url, db)
              : resource === 'ads'
                ? entityRows(db.ads, url, db)
                : resource === 'keywords'
                  ? entityRows(db.keywords, url, db)
                  : resource === 'search-terms'
                    ? entityRows(db.searchTerms, url, db)
                    : resource === 'metrics'
                      ? db.dailyMetrics.filter(
                          (row) =>
                            row.google_ads_account_id === account.id &&
                            row.date >= dateRange(url, db).from &&
                            row.date <= dateRange(url, db).to,
                        )
                      : resource === 'geo'
                        ? dimensionRows('geography', url, db)
                        : resource === 'conversions'
                          ? entityRows(db.campaigns, url, db).map((row) => ({
                              campaign_id: row.campaign_id,
                              conversions: (row.metrics as MockMetrics).conversions,
                              conversion_value_minor: (row.metrics as MockMetrics)
                                .conversion_value_minor,
                            }))
                          : []
      return { body: { data: { results } } }
    }

    if (path === '/analytics/overview') return overview(url, db)
    if (path === '/analytics/breakdown') return breakdown(url, db)
    if (path === '/analytics/export') return exportResponse(url, db)
    if (path === '/analytics/map') return listResponse(dimensionRows('geography', url, db), url)
    const entityMatch = /^\/analytics\/accounts\/([^/]+)\/entities\/([^/]+)$/.exec(path)
    if (entityMatch) {
      url.searchParams.set('ads_account_id', entityMatch[1])
      if (entityMatch[2] === 'devices') return listResponse(dimensionRows('device', url, db), url)
      if (entityMatch[2] === 'geography')
        return listResponse(dimensionRows('geography', url, db), url)
      const source =
        entityMatch[2] === 'campaigns'
          ? db.campaigns
          : entityMatch[2] === 'ad-groups'
            ? db.adGroups
            : entityMatch[2] === 'ads'
              ? db.ads
              : entityMatch[2] === 'keywords'
                ? db.keywords
                : entityMatch[2] === 'search-terms'
                  ? db.searchTerms
                  : []
      return listResponse(entityRows(source, url, db), url)
    }
    const syncMatch = /^\/google-ads\/accounts\/([^/]+)\/(sync|reconcile)$/.exec(path)
    if (syncMatch && method === 'POST') {
      const account = db.accounts.find((candidate) => candidate.id === syncMatch[1])
      if (!account) return jsonError(404, 'NOT_FOUND', 'account not found')
      const job = {
        id: `local-job-${Date.now()}`,
        google_ads_account_id: account.id,
        started_at: new Date().toISOString(),
        finished_at: null,
        status: 'running' as const,
        received: 0,
        inserted: 0,
        updated: 0,
        error: null,
      }
      db.syncJobs.unshift(job)
      account.last_sync_status = 'running'
      return { body: { data: job } }
    }
    if (path === '/google-ads/sync-jobs' && method === 'GET')
      return listResponse(
        db.syncJobs.filter(
          (job) =>
            !url.searchParams.get('ads_account_id') ||
            job.google_ads_account_id === url.searchParams.get('ads_account_id'),
        ),
        url,
      )
    if (path === '/google-ads/sync-errors' && method === 'GET')
      return listResponse(
        db.syncJobs
          .filter((job) => job.error)
          .map((job) => ({
            sync_job_id: job.id,
            google_ads_account_id: job.google_ads_account_id,
            error: job.error,
            occurred_at: job.finished_at ?? job.started_at,
          })),
        url,
      )
    if (path === '/__mock/sentinel') return { body: { data: MOCK_SENTINEL } }
    return undefined
  }
}

function send(res: ServerResponse, response: MockResponse): void {
  const status = response.status ?? 200
  const headers = response.headers ?? { 'content-type': 'application/json; charset=utf-8' }
  res.writeHead(status, {
    'cache-control': 'no-store',
    'x-adcalltrack-data-source': 'local-mock',
    ...headers,
  })
  res.end(response.buffer ?? (status === 204 ? undefined : JSON.stringify(response.body)))
}

export function createMockMiddleware(
  scenario: MockScenario,
  anchor = new Date(),
): Connect.NextHandleFunction {
  const handle = createMockHandler(scenario, anchor)
  return async (req, res, next) => {
    try {
      const response = await handle(req)
      if (!response) {
        next()
        return
      }
      send(res, response)
    } catch (error) {
      console.error('[local-mock]', error)
      send(res, jsonError(500, 'MOCK_HANDLER_ERROR', 'LOCAL MOCK handler failed'))
    }
  }
}

export function mockCredentials() {
  const db = createMockDatabase()
  return { tenantId: db.tenantId, email: MOCK_EMAIL, password: MOCK_PASSWORD }
}
