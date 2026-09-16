import { describe, expect, it } from 'vitest'
import type { AnalyticsMetricTotal, GoogleAdsDayRow } from '../api/types'
import {
  aggregateDailySeries,
  comparisonDailySeries,
  dashboardOverviewQuery,
  formatDashboardDay,
  summarizeDashboardMetrics,
} from './dashboard'

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

function day(
  date: string,
  currency: 'EUR' | 'CHF',
  values: { spend: string; clicks: number; conversions: number; cpa: string | null },
): GoogleAdsDayRow {
  return {
    date,
    currency_code: currency,
    metrics: {
      spend: { amount: values.spend, currency },
      impressions: 100,
      clicks: values.clicks,
      ctr: values.clicks / 100,
      average_cpc: null,
      conversions: values.conversions,
      conversion_rate: null,
      cpa: values.cpa ? { amount: values.cpa, currency } : null,
      conversion_value: { amount: '0.00', currency },
      roas: null,
    },
  }
}

describe('дневные серии Dashboard', () => {
  const rows = [
    day('2026-09-15', 'EUR', { spend: '100.00', clicks: 10, conversions: 2, cpa: '50.00' }),
    day('2026-09-15', 'CHF', { spend: '80.00', clicks: 5, conversions: 0, cpa: null }),
  ]

  it('не складывает денежные показатели разных валют', () => {
    const series = aggregateDailySeries(rows, 'spend')
    expect(series.map((item) => [item.currency, item.points[0].value])).toEqual([
      ['CHF', 80],
      ['EUR', 100],
    ])
  })

  it('агрегирует безденежные показатели и сохраняет null для CPA', () => {
    expect(aggregateDailySeries(rows, 'clicks')[0].points[0].value).toBe(15)
    expect(aggregateDailySeries(rows, 'cpa')[0].points[0].value).toBeNull()
  })

  it('строит отдельные подписанные линии аккаунтов', () => {
    const series = comparisonDailySeries(
      [
        { accountId: 'a-1', accountName: 'Berlin', currency: 'EUR', rows: [rows[0]] },
        { accountId: 'a-2', accountName: 'Zurich', currency: 'CHF', rows: [rows[1]] },
      ],
      'spend',
    )
    expect(series.map((item) => item.label)).toEqual(['Berlin · EUR', 'Zurich · CHF'])
  })
})
