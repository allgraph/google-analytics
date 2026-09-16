import type {
  AnalyticsMetricTotal,
  AnalyticsOverviewQuery,
  AnalyticsOverviewRow,
  GoogleAdsBreakdownRow,
  GoogleAdsDayRow,
} from '../api/types'
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

export type DashboardChartMetric = 'spend' | 'conversions' | 'cpa' | 'clicks'

export interface DashboardChartPoint {
  date: string
  value: number | null
}

export interface DashboardChartSeries {
  id: string
  label: string
  color: string
  currency?: string
  points: DashboardChartPoint[]
}

export interface AccountDailyBreakdown {
  accountId: string
  accountName: string
  currency: string
  rows: readonly GoogleAdsDayRow[]
}

const chartColors = [
  '#4f46e5',
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#f43f5e',
  '#8b5cf6',
  '#14b8a6',
  '#eab308',
  '#ec4899',
  '#64748b',
] as const

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

export function isAccountBreakdownRow(row: GoogleAdsBreakdownRow): row is AnalyticsOverviewRow {
  return 'account_name' in row
}

export function isDayBreakdownRow(row: GoogleAdsBreakdownRow): row is GoogleAdsDayRow {
  return 'date' in row && 'currency_code' in row
}

function metricValue(row: GoogleAdsDayRow, metric: DashboardChartMetric): number | null {
  if (metric === 'spend') return Number(row.metrics.spend.amount)
  if (metric === 'cpa') return row.metrics.cpa ? Number(row.metrics.cpa.amount) : null
  return row.metrics[metric]
}

export function aggregateDailySeries(
  rows: readonly GoogleAdsDayRow[],
  metric: DashboardChartMetric,
): DashboardChartSeries[] {
  const dates = [...new Set(rows.map((row) => row.date))].sort()
  if (metric === 'spend' || metric === 'cpa') {
    const currencies = [...new Set(rows.map((row) => row.currency_code))].sort()
    return currencies.map((currency, index) => {
      const values = new Map(
        rows
          .filter((row) => row.currency_code === currency)
          .map((row) => [row.date, metricValue(row, metric)]),
      )
      return {
        id: `aggregate-${currency}`,
        label: currency,
        currency,
        color: chartColors[index % chartColors.length],
        points: dates.map((date) => ({ date, value: values.get(date) ?? null })),
      }
    })
  }

  const values = new Map<string, number>()
  rows.forEach((row) => {
    const value = metricValue(row, metric)
    if (value !== null) values.set(row.date, (values.get(row.date) ?? 0) + value)
  })
  return [
    {
      id: 'aggregate',
      label: 'Все выбранные аккаунты',
      color: chartColors[0],
      points: dates.map((date) => ({ date, value: values.get(date) ?? null })),
    },
  ]
}

export function comparisonDailySeries(
  accounts: readonly AccountDailyBreakdown[],
  metric: DashboardChartMetric,
): DashboardChartSeries[] {
  return accounts.map((account, index) => ({
    id: account.accountId,
    label:
      metric === 'spend' || metric === 'cpa'
        ? `${account.accountName} · ${account.currency}`
        : account.accountName,
    currency: metric === 'spend' || metric === 'cpa' ? account.currency : undefined,
    color: chartColors[index % chartColors.length],
    points: [...account.rows]
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((row) => ({ date: row.date, value: metricValue(row, metric) })),
  }))
}

export function formatDashboardDay(value: string): string {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}.${month}.${year}` : value
}
