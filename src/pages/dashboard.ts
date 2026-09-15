import type { AnalyticsMetricTotal, AnalyticsOverviewQuery } from '../api/types'
import { periodQueryParams, type PeriodPreset } from '../lib/period'

export const dashboardPeriodPresets = [
  'last7',
  'last30',
  'this_month',
  'previous_month',
  'custom',
] as const satisfies readonly PeriodPreset[]

export interface CustomPeriodRange {
  from: string
  to: string
}

export interface DashboardMetricSummary {
  impressions: number
  clicks: number
  ctr: number | null
  conversions: number
  conversionRate: number | null
  currencyTotals: AnalyticsMetricTotal[]
}

function isIsoDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function dashboardOverviewQuery(
  period: PeriodPreset,
  customRange: CustomPeriodRange,
  accountIds: readonly string[] | undefined,
  now = new Date(),
): AnalyticsOverviewQuery | null {
  const range =
    period === 'custom'
      ? isIsoDay(customRange.from) && isIsoDay(customRange.to) && customRange.from <= customRange.to
        ? customRange
        : null
      : periodQueryParams(period, now)

  if (!range) return null

  return {
    from: range.from,
    to: range.to,
    ...(accountIds === undefined ? {} : { ads_account_ids: accountIds }),
  }
}

export function summarizeDashboardMetrics(
  totals: readonly AnalyticsMetricTotal[],
): DashboardMetricSummary {
  const impressions = totals.reduce((sum, total) => sum + total.impressions, 0)
  const clicks = totals.reduce((sum, total) => sum + total.clicks, 0)
  const conversions = totals.reduce((sum, total) => sum + total.conversions, 0)

  return {
    impressions,
    clicks,
    ctr: impressions === 0 ? null : (clicks / impressions) * 100,
    conversions,
    conversionRate: clicks === 0 ? null : (conversions / clicks) * 100,
    currencyTotals: [...totals].sort((left, right) =>
      left.spend.currency.localeCompare(right.spend.currency),
    ),
  }
}

export function formatDashboardDay(value: string): string {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}.${month}.${year}` : value
}
