import { Alert, Button, Empty, Segmented, Skeleton, Table } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import type { SorterResult } from 'antd/es/table/interface'
import { useMemo, useState } from 'react'
import { useAnalyticsBreakdownQueries, useAnalyticsBreakdownQuery } from '../api/hooks'
import type {
  AnalyticsMetricTotal,
  AnalyticsOverviewQuery,
  AnalyticsOverviewRow,
  GoogleAdsAccount,
  SortOrder,
} from '../api/types'
import { ApiErrorState } from '../components/ApiErrorState'
import { formatMoney, formatNumber, formatPercent } from '../lib/format'
import {
  aggregateDailySeries,
  comparisonDailySeries,
  formatDashboardDay,
  isAccountBreakdownRow,
  isDayBreakdownRow,
  summarizeDashboardMetrics,
  type AccountDailyBreakdown,
  type DashboardChartMetric,
  type DashboardChartSeries,
} from './dashboard'
import styles from './DashboardInsights.module.css'

type ChartMode = 'aggregate' | 'comparison'
type SortField =
  | 'account_name'
  | 'spend'
  | 'impressions'
  | 'clicks'
  | 'ctr'
  | 'average_cpc'
  | 'conversions'
  | 'cpa'

interface SortState {
  field: SortField
  order: SortOrder
}

interface DashboardInsightsProps {
  query: AnalyticsOverviewQuery
  accounts: GoogleAdsAccount[]
  totals: AnalyticsMetricTotal[]
}

const chartDefinitions: Array<{ metric: DashboardChartMetric; title: string }> = [
  { metric: 'spend', title: 'Расход по дням' },
  { metric: 'conversions', title: 'Конверсии по дням' },
  { metric: 'cpa', title: 'CPA по дням' },
  { metric: 'clicks', title: 'Клики по дням' },
]

function tableSortOrder(sort: SortState, field: SortField) {
  if (sort.field !== field) return null
  return sort.order === 'asc' ? ('ascend' as const) : ('descend' as const)
}

function CurrencyTotals({
  totals,
  field,
}: {
  totals: readonly AnalyticsMetricTotal[]
  field: 'spend' | 'average_cpc' | 'cpa'
}) {
  return (
    <span className={styles.currencyTotals}>
      {totals.map((total) => (
        <span key={total.spend.currency}>{formatMoney(total[field])}</span>
      ))}
    </span>
  )
}

function AccountComparisonTable({
  query,
  totals,
  sort,
  onSortChange,
}: {
  query: ReturnType<typeof useAnalyticsBreakdownQuery>
  totals: AnalyticsMetricTotal[]
  sort: SortState
  onSortChange: (sort: SortState) => void
}) {
  const rows = useMemo(
    () => query.data?.data.rows.filter(isAccountBreakdownRow) ?? [],
    [query.data],
  )
  const summary = useMemo(() => summarizeDashboardMetrics(totals), [totals])
  const columns = useMemo<TableColumnsType<AnalyticsOverviewRow>>(
    () => [
      {
        key: 'account_name',
        dataIndex: 'account_name',
        title: 'Аккаунт',
        fixed: 'left',
        width: 220,
        sorter: true,
        sortOrder: tableSortOrder(sort, 'account_name'),
      },
      {
        key: 'spend',
        title: 'Расход',
        width: 140,
        align: 'right',
        sorter: true,
        sortOrder: tableSortOrder(sort, 'spend'),
        render: (_value, row) => formatMoney(row.metrics.spend),
      },
      {
        key: 'impressions',
        title: 'Показы',
        width: 120,
        align: 'right',
        sorter: true,
        sortOrder: tableSortOrder(sort, 'impressions'),
        render: (_value, row) => formatNumber(row.metrics.impressions),
      },
      {
        key: 'clicks',
        title: 'Клики',
        width: 110,
        align: 'right',
        sorter: true,
        sortOrder: tableSortOrder(sort, 'clicks'),
        render: (_value, row) => formatNumber(row.metrics.clicks),
      },
      {
        key: 'ctr',
        title: 'CTR',
        width: 100,
        align: 'right',
        sorter: true,
        sortOrder: tableSortOrder(sort, 'ctr'),
        render: (_value, row) =>
          formatPercent(row.metrics.ctr === null ? null : row.metrics.ctr * 100),
      },
      {
        key: 'average_cpc',
        title: 'CPC',
        width: 120,
        align: 'right',
        sorter: true,
        sortOrder: tableSortOrder(sort, 'average_cpc'),
        render: (_value, row) => formatMoney(row.metrics.average_cpc),
      },
      {
        key: 'conversions',
        title: 'Конверсии',
        width: 130,
        align: 'right',
        sorter: true,
        sortOrder: tableSortOrder(sort, 'conversions'),
        render: (_value, row) => formatNumber(row.metrics.conversions),
      },
      {
        key: 'cpa',
        title: 'CPA',
        width: 120,
        align: 'right',
        sorter: true,
        sortOrder: tableSortOrder(sort, 'cpa'),
        render: (_value, row) => formatMoney(row.metrics.cpa),
      },
    ],
    [sort],
  )

  const handleChange: TableProps<AnalyticsOverviewRow>['onChange'] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    const current = (
      Array.isArray(sorter) ? sorter[0] : sorter
    ) as SorterResult<AnalyticsOverviewRow>
    const field = current.columnKey as SortField | undefined
    if (!field || !current.order) return
    onSortChange({ field, order: current.order === 'ascend' ? 'asc' : 'desc' })
  }

  if (query.isPending) return <Skeleton active paragraph={{ rows: 6 }} />
  if (query.isError) {
    return (
      <div className={styles.queryState}>
        <ApiErrorState error={query.error} />
        <Button loading={query.isFetching} onClick={() => void query.refetch()}>
          Повторить
        </Button>
      </div>
    )
  }

  return (
    <Table<AnalyticsOverviewRow>
      className={styles.table}
      columns={columns}
      dataSource={rows}
      rowKey="google_ads_account_id"
      size="middle"
      pagination={false}
      scroll={{ x: 1060 }}
      onChange={handleChange}
      sortDirections={['descend', 'ascend']}
      showSorterTooltip={{ target: 'sorter-icon' }}
      locale={{ emptyText: <Empty description="За выбранный период данных нет" /> }}
      summary={() =>
        rows.length ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <strong>Итого</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <CurrencyTotals totals={summary.currencyTotals} field="spend" />
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <strong>{formatNumber(summary.impressions)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <strong>{formatNumber(summary.clicks)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right">
              <strong>{formatPercent(summary.ctr)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right">
              <CurrencyTotals totals={summary.currencyTotals} field="average_cpc" />
            </Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="right">
              <strong>{formatNumber(summary.conversions)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7} align="right">
              <CurrencyTotals totals={summary.currencyTotals} field="cpa" />
            </Table.Summary.Cell>
          </Table.Summary.Row>
        ) : null
      }
    />
  )
}

function chartValue(value: number, currency?: string) {
  return currency ? formatMoney({ amount: String(value), currency }) : formatNumber(value)
}

function lineSegments(series: DashboardChartSeries, dates: string[], maxValue: number) {
  const width = 640
  const height = 220
  const left = 52
  const right = 18
  const top = 18
  const bottom = 31
  const innerWidth = width - left - right
  const innerHeight = height - top - bottom
  const x = (date: string) => {
    const index = dates.indexOf(date)
    return dates.length <= 1
      ? left + innerWidth / 2
      : left + (index / (dates.length - 1)) * innerWidth
  }
  const y = (value: number) => top + innerHeight - (value / maxValue) * innerHeight
  const segments: Array<Array<{ date: string; value: number }>> = []
  let current: Array<{ date: string; value: number }> = []
  series.points.forEach((point) => {
    if (point.value === null || !Number.isFinite(point.value)) {
      if (current.length) segments.push(current)
      current = []
      return
    }
    current.push({ date: point.date, value: point.value })
  })
  if (current.length) segments.push(current)
  return { segments, x, y }
}

function DailyChart({ title, series }: { title: string; series: DashboardChartSeries[] }) {
  const dates = [
    ...new Set(series.flatMap((item) => item.points.map((point) => point.date))),
  ].sort()
  const values = series.flatMap((item) =>
    item.points.flatMap((point) => (point.value === null ? [] : [point.value])),
  )
  if (!dates.length || !values.length) {
    return (
      <article className={styles.chartCard}>
        <h3>{title}</h3>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет данных" />
      </article>
    )
  }

  const actualMax = Math.max(0, ...values)
  const scaleMax = actualMax > 0 ? actualMax * 1.08 : 1
  return (
    <article className={styles.chartCard}>
      <h3>{title}</h3>
      <div className={styles.chartLegend} aria-label="Легенда графика">
        {series.map((item) => (
          <span key={item.id} title={item.label}>
            <i style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg
        className={styles.chart}
        viewBox="0 0 640 220"
        role="img"
        aria-label={`${title}. ${series.length} серий`}
      >
        {[18, 103.5, 189].map((y) => (
          <line key={y} x1="52" y1={y} x2="622" y2={y} className={styles.gridLine} />
        ))}
        <text x="46" y="22" textAnchor="end" className={styles.axisLabel}>
          {formatNumber(actualMax)}
        </text>
        <text x="46" y="193" textAnchor="end" className={styles.axisLabel}>
          0
        </text>
        <text x="52" y="213" textAnchor="start" className={styles.axisLabel}>
          {formatDashboardDay(dates[0]).slice(0, 5)}
        </text>
        <text x="622" y="213" textAnchor="end" className={styles.axisLabel}>
          {formatDashboardDay(dates[dates.length - 1]).slice(0, 5)}
        </text>
        {series.map((item) => {
          const geometry = lineSegments(item, dates, scaleMax)
          return (
            <g key={item.id}>
              {geometry.segments.map((segment, index) => (
                <polyline
                  key={index}
                  points={segment
                    .map((point) => `${geometry.x(point.date)},${geometry.y(point.value)}`)
                    .join(' ')}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {geometry.segments.flat().map((point) => (
                <circle
                  key={`${point.date}-${point.value}`}
                  cx={geometry.x(point.date)}
                  cy={geometry.y(point.value)}
                  r="5"
                  fill={dates.length === 1 ? item.color : 'transparent'}
                  stroke={dates.length === 1 ? item.color : 'transparent'}
                >
                  <title>{`${formatDashboardDay(point.date)}: ${chartValue(point.value, item.currency)}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>
    </article>
  )
}

export function DashboardInsights({ query, accounts, totals }: DashboardInsightsProps) {
  const [sort, setSort] = useState<SortState>({ field: 'spend', order: 'desc' })
  const [chartMode, setChartMode] = useState<ChartMode>('aggregate')
  const effectiveMode = accounts.length > 1 ? chartMode : 'aggregate'

  const tableParams = useMemo(
    () => ({ ...query, group_by: 'account' as const, page: 1, per_page: 100, ...sort }),
    [query, sort],
  )
  const dailyParams = useMemo(
    () => ({ ...query, group_by: 'day' as const, page: 1, per_page: 1000 }),
    [query],
  )
  const comparisonParams = useMemo(
    () =>
      accounts.map((account) => ({
        ...query,
        ads_account_ids: [account.id],
        group_by: 'day' as const,
        page: 1,
        per_page: 1000,
      })),
    [accounts, query],
  )

  const tableQuery = useAnalyticsBreakdownQuery(tableParams)
  const dailyQuery = useAnalyticsBreakdownQuery(dailyParams)
  const comparisonQueries = useAnalyticsBreakdownQueries(comparisonParams, {
    enabled: effectiveMode === 'comparison',
  })

  const aggregateRows = useMemo(
    () => dailyQuery.data?.data.rows.filter(isDayBreakdownRow) ?? [],
    [dailyQuery.data],
  )
  const accountBreakdowns = useMemo<AccountDailyBreakdown[]>(
    () =>
      accounts.map((account, index) => ({
        accountId: account.id,
        accountName: account.name,
        currency: account.currency_code,
        rows: comparisonQueries[index]?.data?.data.rows.filter(isDayBreakdownRow) ?? [],
      })),
    [accounts, comparisonQueries],
  )

  const chartsPending =
    effectiveMode === 'aggregate'
      ? dailyQuery.isPending
      : comparisonQueries.some((item) => item.isPending)
  const chartError =
    effectiveMode === 'aggregate'
      ? dailyQuery.isError
        ? dailyQuery.error
        : null
      : (comparisonQueries.find((item) => item.isError)?.error ?? null)

  const seriesFor = (metric: DashboardChartMetric) =>
    effectiveMode === 'aggregate'
      ? aggregateDailySeries(aggregateRows, metric)
      : comparisonDailySeries(accountBreakdowns, metric)

  return (
    <div className={styles.insights}>
      <section className={styles.panel} aria-labelledby="account-comparison-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="account-comparison-title">Сравнение аккаунтов</h2>
            <p>Сортировка выполняется на сервере для выбранного периода.</p>
          </div>
        </div>
        <AccountComparisonTable
          query={tableQuery}
          totals={totals}
          sort={sort}
          onSortChange={setSort}
        />
      </section>

      <section className={styles.chartsSection} aria-labelledby="daily-charts-title">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="daily-charts-title">Динамика по дням</h2>
            <p>Один период и набор аккаунтов применены ко всем четырём графикам.</p>
          </div>
          <Segmented<ChartMode>
            value={effectiveMode}
            options={[
              { label: 'Агрегированно', value: 'aggregate' },
              { label: 'Сравнение аккаунтов', value: 'comparison', disabled: accounts.length < 2 },
            ]}
            onChange={setChartMode}
          />
        </div>

        {chartError ? (
          <div className={styles.queryState}>
            <ApiErrorState error={chartError} />
            <Button
              onClick={() => {
                if (effectiveMode === 'aggregate') void dailyQuery.refetch()
                else comparisonQueries.forEach((item) => void item.refetch())
              }}
            >
              Повторить
            </Button>
          </div>
        ) : chartsPending ? (
          <div className={styles.chartGrid} aria-label="Загрузка дневных графиков">
            {chartDefinitions.map((item) => (
              <div key={item.metric} className={styles.chartCard}>
                <Skeleton active paragraph={{ rows: 5 }} />
              </div>
            ))}
          </div>
        ) : aggregateRows.length === 0 && effectiveMode === 'aggregate' ? (
          <Alert type="info" showIcon title="За выбранный период дневных данных нет" />
        ) : (
          <div className={styles.chartGrid}>
            {chartDefinitions.map((item) => (
              <DailyChart key={item.metric} title={item.title} series={seriesFor(item.metric)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
