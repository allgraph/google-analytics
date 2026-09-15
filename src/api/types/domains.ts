import type {
  BreakdownGroup,
  CurrencyCode,
  DataSource,
  EntityId,
  IsoDate,
  IsoDateTime,
  Money,
  NullableMetric,
  RoleCode,
} from './common.js'
import type { PaginationMeta } from './envelopes.js'

export interface AuthSession {
  user_id: EntityId
  tenant_id: EntityId
  role: RoleCode
  token_type: string
  access_token: string
  access_expires_at: IsoDateTime
  refresh_token: string
  refresh_expires_at: IsoDateTime
}

export interface CurrentUser {
  user_id: EntityId
  tenant_id: EntityId
  membership_id: EntityId
  role: RoleCode
  site_ids: EntityId[] | null
  project_ids: EntityId[] | null
  issued_at: IsoDateTime
  expires_at: IsoDateTime
}

export type GoogleAdsAccountStatus = 'active' | 'inactive'
export type GoogleAdsConnectionStatus = 'connected' | 'disconnected' | 'error'
export type GoogleAdsSyncStatus = 'success' | 'running' | 'failed' | 'stale'
export type GoogleAdsEntityStatus = 'enabled' | 'paused' | 'removed'
export type GoogleAdsMatchType = 'broad' | 'phrase' | 'exact'

export interface GoogleAdsAccount {
  data_source: DataSource
  id: EntityId
  tenant_id: EntityId
  name: string
  google_ads_customer_id: string
  currency_code: CurrencyCode
  country_code: string
  timezone: string
  status: GoogleAdsAccountStatus
  connection_status: GoogleAdsConnectionStatus
  connected_at: IsoDateTime | null
  last_sync_at: IsoDateTime | null
  last_sync_status: GoogleAdsSyncStatus | null
  last_sync_error: string | null
  created_at: IsoDateTime
  updated_at: IsoDateTime
}

/** Numeric values exactly as returned by the backend before money normalization. */
export interface AdvertisingMetricValuesDto {
  spend_minor: number
  impressions: number
  clicks: number
  ctr: NullableMetric
  average_cpc_minor: number | null
  conversions: number
  conversion_rate: NullableMetric
  cpa_minor: number | null
  conversion_value_minor: number
  roas: NullableMetric
}

export interface AdvertisingMetricsDto extends AdvertisingMetricValuesDto {
  currency_code: CurrencyCode
}

export interface AdvertisingMetrics {
  spend: Money
  impressions: number
  clicks: number
  ctr: NullableMetric
  average_cpc: Money | null
  conversions: number
  conversion_rate: NullableMetric
  cpa: Money | null
  conversion_value: Money
  roas: NullableMetric
}

interface GoogleAdsEntityIdentity {
  id: string
  google_ads_account_id: EntityId
  name: string | null
  status: GoogleAdsEntityStatus
}

export interface GoogleAdsEntityDto extends GoogleAdsEntityIdentity {
  campaign_id?: string
  ad_group_id?: string
  ad_id?: string
  keyword_id?: string
  type?: string | null
  match_type?: GoogleAdsMatchType | null
  privacy_restricted?: boolean
  metrics: AdvertisingMetricsDto
  data_source: DataSource
}

export interface GoogleAdsEntity extends GoogleAdsEntityIdentity {
  campaign_id?: string
  ad_group_id?: string
  ad_id?: string
  keyword_id?: string
  type?: string | null
  match_type?: GoogleAdsMatchType | null
  privacy_restricted?: boolean
  metrics: AdvertisingMetrics
  data_source: DataSource
}

export interface GoogleAdsCampaignDto extends GoogleAdsEntityDto {
  campaign_id: string
  type: string | null
}

export interface GoogleAdsCampaign extends GoogleAdsEntity {
  campaign_id: string
  type: string | null
}

export interface GoogleAdsAdGroupDto extends GoogleAdsEntityDto {
  campaign_id: string
  ad_group_id: string
}

export interface GoogleAdsAdGroup extends GoogleAdsEntity {
  campaign_id: string
  ad_group_id: string
}

export interface GoogleAdsAdDto extends GoogleAdsEntityDto {
  campaign_id: string
  ad_group_id: string
  ad_id: string
  type: string | null
}

export interface GoogleAdsAd extends GoogleAdsEntity {
  campaign_id: string
  ad_group_id: string
  ad_id: string
  type: string | null
}

export interface GoogleAdsKeywordDto extends GoogleAdsEntityDto {
  campaign_id: string
  ad_group_id: string
  keyword_id: string
  match_type: GoogleAdsMatchType | null
}

export interface GoogleAdsKeyword extends GoogleAdsEntity {
  campaign_id: string
  ad_group_id: string
  keyword_id: string
  match_type: GoogleAdsMatchType | null
}

export interface GoogleAdsSearchTermDto extends GoogleAdsEntityDto {
  campaign_id: string
  ad_group_id: string
  keyword_id: string
  match_type: GoogleAdsMatchType | null
  privacy_restricted: boolean
}

export interface GoogleAdsSearchTerm extends GoogleAdsEntity {
  campaign_id: string
  ad_group_id: string
  keyword_id: string
  match_type: GoogleAdsMatchType | null
  privacy_restricted: boolean
}

export interface GoogleAdsDimensionDto {
  google_ads_account_id: EntityId
  device?: string
  country?: string
  region?: string | null
  city?: string | null
  geo_id?: string | null
  metrics: AdvertisingMetricsDto
  data_source: DataSource
}

export interface GoogleAdsDimension extends Omit<GoogleAdsDimensionDto, 'metrics'> {
  metrics: AdvertisingMetrics
}

export interface GoogleAdsGeoRowDto extends GoogleAdsDimensionDto {
  country: string
  region: string | null
  city: string | null
  geo_id: string | null
}

export interface GoogleAdsGeoRow extends GoogleAdsDimension {
  country: string
  region: string | null
  city: string | null
  geo_id: string | null
}

export interface GoogleAdsDeviceRowDto extends GoogleAdsDimensionDto {
  device: string
}

export interface GoogleAdsDeviceRow extends GoogleAdsDimension {
  device: string
}

export interface AnalyticsOverviewRowDto {
  google_ads_account_id: EntityId
  account_name: string
  metrics: AdvertisingMetricsDto
}

export interface AnalyticsOverviewRow extends Omit<AnalyticsOverviewRowDto, 'metrics'> {
  metrics: AdvertisingMetrics
}

export interface AnalyticsMetricTotalDto extends AdvertisingMetricValuesDto {
  currency_code: CurrencyCode
}

export type AnalyticsMetricTotal = AdvertisingMetrics

export interface AnalyticsOverviewDto {
  from: IsoDate
  to: IsoDate
  data_source: DataSource
  rows: AnalyticsOverviewRowDto[]
  totals: AnalyticsMetricTotalDto[]
}

export interface AnalyticsOverview extends Omit<AnalyticsOverviewDto, 'rows' | 'totals'> {
  rows: AnalyticsOverviewRow[]
  totals: AnalyticsMetricTotal[]
}

export interface GoogleAdsDayRowDto {
  date: IsoDate
  currency_code: CurrencyCode
  metrics: AdvertisingMetricsDto
}

export interface GoogleAdsDayRow {
  date: IsoDate
  currency_code: CurrencyCode
  metrics: AdvertisingMetrics
}

export type GoogleAdsBreakdownRowDto =
  AnalyticsOverviewRowDto | GoogleAdsEntityDto | GoogleAdsDimensionDto | GoogleAdsDayRowDto

export type GoogleAdsBreakdownRow =
  AnalyticsOverviewRow | GoogleAdsEntity | GoogleAdsDimension | GoogleAdsDayRow

export interface AnalyticsBreakdownDto {
  from: IsoDate
  to: IsoDate
  group_by: BreakdownGroup
  data_source: DataSource
  rows: GoogleAdsBreakdownRowDto[]
  pagination: { limit: number; offset: number; total?: number }
}

export interface AnalyticsBreakdown extends Omit<AnalyticsBreakdownDto, 'rows' | 'pagination'> {
  rows: GoogleAdsBreakdownRow[]
  pagination: PaginationMeta
}

export interface GoogleAdsConnection {
  ads_account_id: EntityId
  connected: boolean
  status: GoogleAdsConnectionStatus
}

export interface GoogleAdsOAuthStart {
  authorization_url: string
}

export interface GoogleAdsOAuthCallback {
  connected: true
  ads_account_id: EntityId
}

export interface GoogleAdsSyncJob {
  id: EntityId
  google_ads_account_id: EntityId
  started_at: IsoDateTime
  finished_at: IsoDateTime | null
  status: 'running' | 'success' | 'failed'
  received: number
  inserted: number
  updated: number
  error: string | null
}

export interface GoogleAdsSyncError {
  sync_job_id: EntityId
  google_ads_account_id: EntityId
  error: string
  occurred_at: IsoDateTime
}
