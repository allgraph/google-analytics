export type EntityId = string
export type IsoDateTime = string
export type CurrencyCode = string

export interface Money {
  amount: string
  currency: CurrencyCode
}

export interface ReferenceItem {
  id: EntityId
  label: string
  parent_id?: EntityId | null
}

export type NullableMetric = number | null
export type RoleCode =
  'owner' | 'manager' | 'marketer' | 'operator' | 'accountant' | 'client' | 'technical_admin'
export type AccessLevel = 'full' | 'read' | 'none'
export type CallStatus = 'answered' | 'missed'
export type ConfidenceCategory = 'high' | 'probable' | 'review' | 'unattributed'
export type UnattributedReason =
  'over_five_minutes' | 'no_phone_click' | 'multiple_candidates' | 'direct_call'
export type LeadStatus =
  | 'new_call'
  | 'missed'
  | 'spam'
  | 'unsuitable'
  | 'price_request'
  | 'qualified_lead'
  | 'master_assigned'
  | 'master_departed'
  | 'order_completed'
  | 'payment_received'
  | 'cancelled'
  | 'refund'
  | 'repeat_order'

export interface ReportFilter {
  date_from?: IsoDateTime
  date_to?: IsoDateTime
  account_ids?: EntityId[]
  site_ids?: EntityId[]
  campaign_ids?: EntityId[]
  ad_group_ids?: EntityId[]
  keyword_ids?: EntityId[]
  search_query_ids?: EntityId[]
  ad_ids?: EntityId[]
  devices?: string[]
  countries?: string[]
  city_ids?: EntityId[]
  district_ids?: EntityId[]
  service_ids?: EntityId[]
  operator_ids?: EntityId[]
  master_ids?: EntityId[]
  lead_statuses?: LeadStatus[]
  confidence_categories?: ConfidenceCategory[]
}

export interface MetricSet {
  ad_spend?: Money
  impressions?: number
  clicks?: number
  ctr?: NullableMetric
  cpc?: Money | null
  phone_clicks?: number
  calls?: number
  missed_calls?: number
  matched_calls?: number
  leads?: number
  orders?: number
  revenue?: Money
  expenses?: Money
  profit?: Money
  roi?: NullableMetric
  cpl?: Money | null
  cpa?: Money | null
  roas?: NullableMetric
}
