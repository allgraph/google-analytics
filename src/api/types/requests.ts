import type {
  BreakdownGroup,
  CurrencyCode,
  DataSource,
  EntityId,
  ExportFormat,
  GoogleAdsEntityKind,
  IsoDate,
  IsoDateTime,
  SortOrder,
} from './common.js'
import type { GoogleAdsAccountStatus, GoogleAdsMatchType } from './domains.js'
import type { PageParams } from './envelopes.js'

export interface LoginRequest {
  tenant_id: EntityId
  email: string
  password: string
  totp_code?: string
  recovery_code?: string
}

export interface AdsAccountWriteRequest {
  name: string
  google_ads_customer_id: string
  currency_code: CurrencyCode
  country_code: string
  status?: GoogleAdsAccountStatus
}

export interface AnalyticsFilters {
  from?: IsoDate | IsoDateTime
  to?: IsoDate | IsoDateTime
  ads_account_id?: EntityId
  ads_account_ids?: readonly EntityId[]
  data_source?: DataSource
  site_id?: EntityId
  campaign_id?: string
  ad_group_id?: string
  keyword?: string
  search_term?: string
  ad_id?: string
  device?: string
  country?: string
  city?: string
  match_type?: GoogleAdsMatchType
  status?: string
}

export interface AdsAccountsQuery extends Partial<PageParams> {
  sort?: string
  order?: SortOrder
}

export type AnalyticsOverviewQuery = AnalyticsFilters

export interface AnalyticsBreakdownQuery extends AnalyticsFilters, Partial<PageParams> {
  group_by: BreakdownGroup
  sort?: string
  order?: SortOrder
}

export interface GoogleAdsEntitiesQuery extends AnalyticsFilters, Partial<PageParams> {
  entity: GoogleAdsEntityKind
  sort?: string
  order?: SortOrder
}

export interface GoogleAdsSyncHistoryQuery extends Partial<PageParams> {
  ads_account_id?: EntityId
  status?: string
}

export interface GoogleAdsSyncRequest {
  through?: IsoDateTime
}

export interface GoogleAdsReconcileRequest {
  day?: IsoDate
}

export interface AnalyticsExportRequest extends AnalyticsFilters {
  format: ExportFormat
  group_by?: BreakdownGroup
  columns?: readonly string[]
}
