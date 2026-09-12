import type {
  AccessLevel,
  CallStatus,
  ConfidenceCategory,
  EntityId,
  IsoDateTime,
  LeadStatus,
  MetricSet,
  Money,
  ReferenceItem,
  ReportFilter,
  RoleCode,
  UnattributedReason,
} from './common'

export interface CurrentUser {
  id: EntityId
  name: string
  email: string
  role: RoleCode
  account_ids: EntityId[]
  site_ids: EntityId[]
  section_access: Record<string, AccessLevel>
  capabilities: string[]
}

export interface FunnelStep {
  code: string
  label: string
  value: number
  conversion?: number | null
}

export interface DashboardOverview {
  metrics: MetricSet
  funnel: FunnelStep[]
}

export interface SiteMetric {
  site_id: EntityId
  site_name: string
  account_id?: EntityId
  metrics: MetricSet
}

export interface Call {
  id: EntityId
  call_id: string
  started_at: IsoDateTime
  caller_phone: string
  site: ReferenceItem
  wait_duration_seconds: number
  talk_duration_seconds: number
  status: CallStatus
  operator?: ReferenceItem | null
  confidence: ConfidenceCategory
  source?: string | null
  campaign?: string | null
  ad_group?: string | null
  keyword?: string | null
  is_repeat: boolean
  lead_id?: EntityId | null
  has_recording?: boolean
}

export interface CallDetails extends Call {
  answered_at?: IsoDateTime | null
  ended_at?: IsoDateTime | null
  first_touch_source?: string | null
  last_touch_source?: string | null
  recording_transcript?: string | null
}

export interface Recording {
  url: string
  expires_at: IsoDateTime
}

export interface BulkActionResult {
  processed: number
  failed: number
}

export interface PhoneClick {
  phone_click_id: EntityId
  occurred_at: IsoDateTime
  site_id: EntityId
  visitor_id: string
  session_id: string
  destination_phone: string
  source?: string | null
  campaign?: string | null
  ad_group?: string | null
  keyword?: string | null
  device?: string | null
  landing_page: string
  current_page: string
  linked_call_id: EntityId | null
}

export interface ScoreExplanation {
  code: string
  text: string
  points: number
  order: number
}

export interface MatchingItem {
  call: Call
  score: number
  category: ConfidenceCategory
  candidate_count: number
  has_tie: boolean
  unattributed_reason?: UnattributedReason | null
}

export interface MatchingCandidate {
  phone_click: PhoneClick
  score: number
  category: ConfidenceCategory
  time_delta_seconds: number
  explanations: ScoreExplanation[]
}

export interface MatchingCandidates {
  call_id: EntityId
  has_tie: boolean
  candidates: MatchingCandidate[]
}

export interface MatchingDecision {
  call_id: EntityId
  decision: 'match' | 'unattributed'
  phone_click_id?: EntityId | null
  decided_by: EntityId
  decided_at: IsoDateTime
}

export interface Recalculation {
  id: EntityId
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress_percent: number
  processed?: number
  skipped_manual?: number
  category_changes?: Record<string, number>
}

export interface Lead {
  id: EntityId
  number: string
  occurred_at: IsoDateTime
  client_name: string
  phone: string
  site: ReferenceItem
  source: string | null
  campaign?: string | null
  ad_group?: string | null
  keyword?: string | null
  service: ReferenceItem
  city: ReferenceItem
  district: ReferenceItem
  address: string
  master?: ReferenceItem | null
  operator?: ReferenceItem | null
  preliminary_amount: Money | null
  final_amount: Money | null
  status: LeadStatus
  cancellation_reason?: string | null
  call_id?: EntityId | null
}

export interface StatusHistoryItem {
  status: LeadStatus
  author: ReferenceItem
  occurred_at: IsoDateTime
  comment?: string | null
}

export interface LeadDetails extends Lead {
  status_history: StatusHistoryItem[]
}

export interface LeadStatusCount {
  status: LeadStatus
  count: number
}

export interface Shift {
  id: EntityId
  status: 'open' | 'closed'
  started_at: IsoDateTime
  closed_at?: IsoDateTime | null
  unresolved_mandatory_leads: number
}

export interface AnalyticsRow {
  id: EntityId
  label: string
  level: 'account' | 'campaign' | 'ad_group' | 'keyword'
  parent_id?: EntityId | null
  customer_id?: string | null
  match_type?: string | null
  has_children: boolean
  is_total: boolean
  metrics: MetricSet
}

export interface MissedCall extends Call {
  estimated_loss?: Money | null
}

export interface ExportJob {
  id: EntityId
  status: 'queued' | 'running' | 'completed' | 'failed'
  download_url?: string | null
  expires_at?: IsoDateTime | null
  error_message?: string | null
}

export interface OrderFinancials {
  customer_amount?: Money
  master_payment?: Money
  materials?: Money
  transport?: Money
  payment_fee?: Money
  discount?: Money
  refund?: Money
  other_direct_expenses?: Money
  ad_spend?: Money
  profit_before_ads?: Money
  net_profit?: Money
}

export interface OrderFinance {
  order_id: EntityId
  lead_id: EntityId
  site?: ReferenceItem
  completed_at: IsoDateTime
  financials: OrderFinancials
  is_repeat_revenue: boolean
  is_unattributed: boolean
}

export interface Notification {
  id: EntityId
  rule_code: string
  title: string
  message: string
  occurred_at: IsoDateTime
  state: 'active' | 'processed'
  object_type: string
  object_id: EntityId
  frontend_path: string
  metric_value?: number | string | null
  processed_by?: EntityId | null
  processed_at?: IsoDateTime | null
}

export interface NotificationRule {
  id: EntityId
  code: string
  name: string
  metric: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  threshold: number
  period_seconds: number
  channel: 'telegram'
  recipient_roles: RoleCode[]
  enabled: boolean
}

export interface Site {
  id: EntityId
  account_id: EntityId
  domain: string
  permanent_phone: string
  city: string
  service_directions: string[]
  tracking_script_status: 'installed' | 'unavailable' | 'not_installed'
}

export interface Account {
  id: EntityId
  name: string
  customer_id: string
  country: string
  currency: string
  status: 'connected' | 'disconnected' | 'error'
  sites: Site[]
}

export interface PhoneNumber {
  id: EntityId
  site_id: EntityId
  phone: string
  active: boolean
}

export interface MatchingConfig {
  version: string
  updated_at: IsoDateTime
  time_windows_seconds: [number, number, number, number]
  thresholds: { high: number; probable: number; review: number }
  rules: Array<{ code: string; label: string; points: number }>
}

export interface IntegrationStatus {
  status: 'connected' | 'disconnected' | 'degraded' | 'error'
  last_success_at: IsoDateTime | null
  last_error?: string | null
}

export interface User {
  id: EntityId
  name: string
  email: string
  role: RoleCode
  active: boolean
  account_ids: EntityId[]
  site_ids: EntityId[]
}

export interface RoleDefinition {
  code: RoleCode
  label: string
  sections: Record<string, AccessLevel>
  hidden_field_groups: Array<'money' | 'advertising' | 'staff' | 'recordings' | 'transcripts'>
}

export interface AuditLogEntry {
  id: EntityId
  occurred_at: IsoDateTime
  user: ReferenceItem
  role: RoleCode
  action: string
  object_type: string
  object_id: EntityId
  ip: string
  request_id?: string
}

export interface Health {
  status: 'ok' | 'degraded' | 'unavailable'
  database: 'available' | 'unavailable'
  task_queue: 'available' | 'unavailable'
  last_migration_at: IsoDateTime
  version: string
}

export interface ApiVersion {
  version: string
  environment: 'development' | 'staging' | 'production'
  built_at: IsoDateTime
}

export interface ExportRequest {
  format: 'csv' | 'xlsx'
  filters: ReportFilter
  columns?: string[]
}
