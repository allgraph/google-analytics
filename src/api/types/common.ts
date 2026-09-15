export type EntityId = string
export type IsoDate = string
export type IsoDateTime = string
export type CurrencyCode = string

export interface Money {
  amount: string
  currency: CurrencyCode
}

export type NullableMetric = number | null
export type DataSource = 'demo' | 'google_ads' | 'unverified'
export type SortOrder = 'asc' | 'desc'
export type ExportFormat = 'csv' | 'xlsx'
export type GoogleAdsEntityKind =
  'campaigns' | 'ad-groups' | 'ads' | 'keywords' | 'search-terms' | 'geo' | 'geography' | 'devices'
export type BreakdownGroup =
  | 'account'
  | 'day'
  | 'campaign'
  | 'ad_group'
  | 'ad'
  | 'keyword'
  | 'search_term'
  | 'device'
  | 'country'
  | 'region'
  | 'city'
  | 'geography'

export type RoleCode =
  'owner' | 'manager' | 'marketer' | 'operator' | 'accountant' | 'client' | 'technical_admin'
