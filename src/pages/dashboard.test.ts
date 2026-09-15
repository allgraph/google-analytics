import { describe, expect, it } from 'vitest'
import type { AnalyticsMetricTotal } from '../api/types'
import { dashboardOverviewQuery, formatDashboardDay, summarizeDashboardMetrics } from './dashboard'

function total(
  currency: 'EUR' | 'CHF',
  values: Partial<AnalyticsMetricTotal> = {},
): AnalyticsMetricTotal {
  return {
    spend: { amount: '100.00', currency },
    impressions: 1_000,
    clicks: 100,
    ctr: 0.1,
    average_cpc: { amount: '1.00', currency },
    conversions: 10,
    conversion_rate: 0.1,
    cpa: { amount: '10.00', currency },
    conversion_value: { amount: '250.00', currency },
    roas: 2.5,
    ...values,
  }
}

describe('dashboardOverviewQuery', () => {
  const now = new Date(2026, 8, 16, 12)

  it('строит API-фильтры для периода и нескольких аккаунтов', () => {
    expect(
      dashboardOverviewQuery('last7', { from: '', to: '' }, ['account-1', 'account-2'], now),
    ).toEqual({
      from: '2026-09-10',
      to: '2026-09-16',
      ads_account_ids: ['account-1', 'account-2'],
    })
  })

  it('не добавляет account ids для выбора всех аккаунтов', () => {
    expect(
      dashboardOverviewQuery('last30', { from: '', to: '' }, undefined, now),
    ).not.toHaveProperty('ads_account_ids')
  })

  it('принимает валидный произвольный диапазон и отвергает обратный', () => {
    expect(
      dashboardOverviewQuery(
        'custom',
        { from: '2026-08-01', to: '2026-08-31' },
        ['account-1'],
        now,
      ),
    ).toMatchObject({ from: '2026-08-01', to: '2026-08-31' })
    expect(
      dashboardOverviewQuery(
        'custom',
        { from: '2026-09-10', to: '2026-09-01' },
        ['account-1'],
        now,
      ),
    ).toBeNull()
  })
})

describe('summarizeDashboardMetrics', () => {
  it('суммирует безденежные KPI и сохраняет денежные итоги по валютам', () => {
    const summary = summarizeDashboardMetrics([
      total('EUR'),
      total('CHF', { impressions: 500, clicks: 25, conversions: 5 }),
    ])

    expect(summary).toMatchObject({
      impressions: 1_500,
      clicks: 125,
      ctr: (125 / 1_500) * 100,
      conversions: 15,
      conversionRate: 12,
    })
    expect(summary.currencyTotals.map((item) => item.spend.currency)).toEqual(['CHF', 'EUR'])
  })

  it('сохраняет нули и возвращает null для производных KPI без знаменателя', () => {
    const summary = summarizeDashboardMetrics([
      total('EUR', {
        spend: { amount: '0.00', currency: 'EUR' },
        impressions: 0,
        clicks: 0,
        conversions: 0,
        average_cpc: null,
        cpa: null,
        conversion_value: { amount: '0.00', currency: 'EUR' },
        roas: null,
      }),
    ])

    expect(summary).toMatchObject({
      impressions: 0,
      clicks: 0,
      ctr: null,
      conversions: 0,
      conversionRate: null,
    })
  })
})

it('форматирует API-дату без сдвига часового пояса', () => {
  expect(formatDashboardDay('2026-09-16')).toBe('16.09.2026')
})
