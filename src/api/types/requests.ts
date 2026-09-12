import type {
  EntityId,
  IsoDateTime,
  LeadStatus,
  Money,
  ReportFilter,
  RoleCode,
  UnattributedReason,
} from './common'

export interface CallBulkActionRequest {
  call_ids: EntityId[]
  action: 'mark_reviewed' | 'create_leads' | 'export'
}

export interface MatchingDecisionRequest {
  decision: 'match' | 'unattributed'
  phone_click_id?: EntityId | null
  reason?: UnattributedReason | null
  comment?: string | null
}

export interface RecalculationRequest {
  date_from: IsoDateTime
  date_to: IsoDateTime
  account_id?: EntityId | null
  site_ids?: EntityId[]
  dry_run: boolean
}

export interface LeadWriteRequest {
  client_name: string
  phone: string
  site_id: EntityId
  source?: string | null
  service_id: EntityId
  city_id: EntityId
  district_id: EntityId
  address: string
  occurred_at: IsoDateTime
  master_id?: EntityId | null
  preliminary_amount: Money | null
  final_amount: Money | null
  status: LeadStatus
  cancellation_reason?: string | null
  call_id?: EntityId | null
}

export interface LeadStatusChangeRequest {
  status: LeadStatus
  cancellation_reason?: string | null
  comment?: string | null
}

export interface BulkLeadStatusRequest {
  lead_ids: EntityId[]
  status: LeadStatus
  cancellation_reason?: string | null
}

export interface BulkAssignMasterRequest {
  lead_ids: EntityId[]
  master_id: EntityId
}

export interface AnalyticsExportRequest {
  format: 'csv' | 'xlsx'
  filters: ReportFilter
  columns?: string[]
  report: 'campaign_tree' | 'sites' | 'missed_calls'
}

export interface NotificationRuleWriteRequest {
  threshold?: number
  period_seconds?: number
  recipient_roles?: RoleCode[]
  enabled?: boolean
}

export interface AccountWriteRequest {
  name: string
  customer_id: string
  country: string
  currency: string
}

export interface SiteWriteRequest {
  account_id: EntityId
  domain: string
  permanent_phone: string
  city: string
  service_directions: string[]
}

export interface PhoneNumberWriteRequest {
  site_id: EntityId
  phone: string
  active: boolean
}

export interface UserWriteRequest {
  name: string
  email: string
  role: RoleCode
  active: boolean
  account_ids: EntityId[]
  site_ids: EntityId[]
}
