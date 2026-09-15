import type {
  AdvertisingMetricValuesDto,
  GoogleAdsAccount,
  GoogleAdsSyncJob,
} from '../src/api/types/index.js'

export const MOCK_SENTINEL = 'ADCALLTRACK_LOCAL_MOCK_ONLY_7F3C9A'

export type MockScenario =
  'full' | 'empty' | 'oauth-expired' | 'sync-error' | 'rate-limit' | 'server-error'

export type MockMetrics = AdvertisingMetricValuesDto

export interface MockAccount extends GoogleAdsAccount {
  data_source: 'demo'
  currency_code: 'EUR' | 'CHF'
  country_code: 'DE' | 'AT' | 'CH'
}

export interface MockEntity {
  id: string
  google_ads_account_id: string
  campaign_id?: string
  ad_group_id?: string
  ad_id?: string
  keyword_id?: string
  name: string | null
  status: 'enabled' | 'paused' | 'removed'
  type?: string
  match_type?: 'broad' | 'phrase' | 'exact' | null
  privacy_restricted?: boolean
  metrics_weight: number
}

export interface MockDailyMetric extends MockMetrics {
  date: string
  google_ads_account_id: string
}

export type MockSyncJob = GoogleAdsSyncJob

export interface MockDatabase {
  sentinel: typeof MOCK_SENTINEL
  tenantId: string
  userId: string
  membershipId: string
  accounts: MockAccount[]
  campaigns: MockEntity[]
  adGroups: MockEntity[]
  ads: MockEntity[]
  keywords: MockEntity[]
  searchTerms: MockEntity[]
  dailyMetrics: MockDailyMetric[]
  syncJobs: MockSyncJob[]
}

const id = (group: number, value: number) =>
  `00000000-0000-4${String(group).padStart(3, '0')}-8000-${String(value).padStart(12, '0')}`

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function calculatedMetrics(
  impressions: number,
  clicks: number,
  spendMinor: number,
  conversions: number,
  conversionValueMinor: number,
): MockMetrics {
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

export function createMockDatabase(anchor = new Date()): MockDatabase {
  const tenantId = id(1, 1)
  const now = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 10),
  )
  const accounts: MockAccount[] = Array.from({ length: 10 }, (_, index) => {
    const number = index + 1
    const currencyCode = number > 8 ? 'CHF' : 'EUR'
    const countryCode = number > 8 ? 'CH' : number === 8 ? 'AT' : 'DE'
    const connectionStatus = number === 9 ? 'disconnected' : number === 10 ? 'error' : 'connected'
    const syncStatus =
      number === 7 ? 'running' : number === 8 ? 'stale' : number === 10 ? 'failed' : 'success'
    const createdAt = new Date(now.getTime() - (400 - number) * 86_400_000).toISOString()
    return {
      data_source: 'demo',
      id: id(10, number),
      tenant_id: tenantId,
      name: `LOCAL MOCK Account ${String(number).padStart(2, '0')}`,
      google_ads_customer_id: `9000000${String(number).padStart(3, '0')}`,
      currency_code: currencyCode,
      country_code: countryCode,
      timezone:
        countryCode === 'CH'
          ? 'Europe/Zurich'
          : countryCode === 'AT'
            ? 'Europe/Vienna'
            : 'Europe/Berlin',
      status: number === 9 ? 'inactive' : 'active',
      connection_status: connectionStatus,
      connected_at: connectionStatus === 'connected' ? createdAt : null,
      last_sync_at: new Date(now.getTime() - number * 3_600_000).toISOString(),
      last_sync_status: syncStatus,
      last_sync_error: syncStatus === 'failed' ? 'LOCAL MOCK: Google Ads API unavailable' : null,
      created_at: createdAt,
      updated_at: now.toISOString(),
    }
  })

  const campaigns: MockEntity[] = []
  const adGroups: MockEntity[] = []
  const ads: MockEntity[] = []
  const keywords: MockEntity[] = []
  const searchTerms: MockEntity[] = []

  accounts.forEach((account, accountIndex) => {
    for (let campaignIndex = 1; campaignIndex <= 3; campaignIndex += 1) {
      const campaignId = `${accountIndex + 1}${String(campaignIndex).padStart(3, '0')}`
      campaigns.push({
        id: campaignId,
        google_ads_account_id: account.id,
        campaign_id: campaignId,
        name: `Campaign ${campaignIndex} · ${account.name}`,
        status: campaignIndex === 3 ? 'paused' : 'enabled',
        type: campaignIndex === 1 ? 'SEARCH' : campaignIndex === 2 ? 'PERFORMANCE_MAX' : 'DISPLAY',
        metrics_weight: campaignIndex === 1 ? 0.5 : campaignIndex === 2 ? 0.35 : 0.15,
      })
      for (let groupIndex = 1; groupIndex <= 2; groupIndex += 1) {
        const adGroupId = `${campaignId}${groupIndex}`
        adGroups.push({
          id: adGroupId,
          google_ads_account_id: account.id,
          campaign_id: campaignId,
          ad_group_id: adGroupId,
          name: `Ad Group ${groupIndex}`,
          status: 'enabled',
          metrics_weight: groupIndex === 1 ? 0.6 : 0.4,
        })
        for (let itemIndex = 1; itemIndex <= 2; itemIndex += 1) {
          const adId = `${adGroupId}${itemIndex}`
          const keywordId = `${adGroupId}8${itemIndex}`
          ads.push({
            id: adId,
            google_ads_account_id: account.id,
            campaign_id: campaignId,
            ad_group_id: adGroupId,
            ad_id: adId,
            name: `Responsive search ad ${itemIndex}`,
            status: itemIndex === 2 ? 'paused' : 'enabled',
            type: 'RESPONSIVE_SEARCH_AD',
            metrics_weight: itemIndex === 1 ? 0.7 : 0.3,
          })
          keywords.push({
            id: keywordId,
            google_ads_account_id: account.id,
            campaign_id: campaignId,
            ad_group_id: adGroupId,
            keyword_id: keywordId,
            name: `service keyword ${itemIndex}`,
            status: 'enabled',
            match_type: itemIndex === 1 ? 'phrase' : 'exact',
            metrics_weight: itemIndex === 1 ? 0.65 : 0.35,
          })
          searchTerms.push({
            id: `${keywordId}9`,
            google_ads_account_id: account.id,
            campaign_id: campaignId,
            ad_group_id: adGroupId,
            keyword_id: keywordId,
            name: itemIndex === 2 ? null : `local search query ${groupIndex}`,
            status: 'enabled',
            match_type: itemIndex === 1 ? 'phrase' : null,
            privacy_restricted: itemIndex === 2,
            metrics_weight: itemIndex === 1 ? 0.8 : 0.2,
          })
        }
      }
    }
  })

  const dailyMetrics: MockDailyMetric[] = []
  accounts.forEach((account, accountIndex) => {
    for (let dayOffset = 0; dayOffset < 365; dayOffset += 1) {
      const date = new Date(now.getTime() - dayOffset * 86_400_000)
      const zeroDay = dayOffset % 31 === 0 && accountIndex === 4
      const impressions = zeroDay ? 0 : 700 + accountIndex * 83 + ((dayOffset * 37) % 500)
      const clicks = zeroDay ? 0 : Math.round(impressions * (0.035 + (accountIndex % 4) * 0.004))
      const spendMinor = zeroDay ? 0 : clicks * (95 + accountIndex * 7)
      const conversions =
        zeroDay || dayOffset % 11 === 0
          ? 0
          : Math.max(1, Math.floor(clicks / (8 + (accountIndex % 3))))
      dailyMetrics.push({
        date: isoDay(date),
        google_ads_account_id: account.id,
        ...calculatedMetrics(
          impressions,
          clicks,
          spendMinor,
          conversions,
          conversions * (8200 + accountIndex * 300),
        ),
      })
    }
  })

  const syncJobs: MockSyncJob[] = accounts.flatMap((account, index) => {
    const status =
      account.last_sync_status === 'failed'
        ? 'failed'
        : account.last_sync_status === 'running'
          ? 'running'
          : 'success'
    return [
      {
        id: id(90, index + 1),
        google_ads_account_id: account.id,
        started_at: new Date(now.getTime() - (index + 1) * 3_600_000).toISOString(),
        finished_at:
          status === 'running'
            ? null
            : new Date(now.getTime() - (index + 1) * 3_600_000 + 180_000).toISOString(),
        status,
        received: status === 'running' ? 420 : 1200 + index * 40,
        inserted: status === 'failed' ? 0 : 50 + index,
        updated: status === 'failed' ? 0 : 1150 + index * 39,
        error: status === 'failed' ? 'LOCAL MOCK: quota exhausted' : null,
      },
    ]
  })

  return {
    sentinel: MOCK_SENTINEL,
    tenantId,
    userId: id(2, 1),
    membershipId: id(3, 1),
    accounts,
    campaigns,
    adGroups,
    ads,
    keywords,
    searchTerms,
    dailyMetrics,
    syncJobs,
  }
}

export function sumMetrics(rows: readonly MockMetrics[]): MockMetrics {
  const totals = rows.reduce(
    (sum, row) => ({
      impressions: sum.impressions + row.impressions,
      clicks: sum.clicks + row.clicks,
      spend: sum.spend + row.spend_minor,
      conversions: sum.conversions + row.conversions,
      value: sum.value + row.conversion_value_minor,
    }),
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, value: 0 },
  )
  return calculatedMetrics(
    totals.impressions,
    totals.clicks,
    totals.spend,
    totals.conversions,
    totals.value,
  )
}
