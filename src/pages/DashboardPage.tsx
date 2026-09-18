import { Alert, Button, Card, Empty, Input, Popover, Skeleton, Tooltip } from 'antd'
import { CalendarDays, ChevronDown, CircleHelp, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useAdsAccountsQuery, useAnalyticsOverviewQuery } from '../api/hooks'
import { queryKeys, serverEntities } from '../api/queryKeys'
import type { AnalyticsMetricTotal } from '../api/types'
import { ApiErrorState } from '../components/ApiErrorState'
import { GoogleAdsAccountPicker } from '../components/GoogleAdsAccountPicker'
import {
  EMPTY_VALUE,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent,
} from '../lib/format'
import { periodLabels, type PeriodPreset } from '../lib/period'
import { accountIdsFromUrl, accountIdsToUrl } from '../lib/googleAdsUrlState'
import { useUrlFilters } from '../lib/useUrlFilters'
import { appRoutes } from '../routing/routes'
import pageStyles from './Page.module.css'
import styles from './DashboardPage.module.css'
import { DashboardInsights } from './DashboardInsights'
import {
  dashboardOverviewQuery,
  dashboardPeriodPresets,
  formatDashboardDay,
  summarizeDashboardMetrics,
  type CustomPeriodRange,
} from './dashboard'

const initialCustomRange = (): CustomPeriodRange => {
  const today = new Date()
  const from = new Date(today)
  from.setDate(from.getDate() - 29)
  const isoDay = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return { from: isoDay(from), to: isoDay(today) }
}

interface KpiValue {
  currency: string
  value: string
}

const kpiDescriptions = {
  spend: 'Сумма, потраченная на рекламу за выбранный период.',
  impressions: 'Количество показов объявлений пользователям.',
  clicks: 'Количество кликов пользователей по объявлениям.',
  ctr: 'CTR (Click-Through Rate) — доля показов, завершившихся кликом: клики ÷ показы × 100%.',
  averageCpc: 'Средний CPC (Cost Per Click) — средняя стоимость клика: расход ÷ клики.',
  conversions: 'Количество целевых действий, полученных после взаимодействия с рекламой.',
  conversionRate:
    'Conversion Rate — доля кликов, завершившихся конверсией: конверсии ÷ клики × 100%.',
  cpa: 'CPA (Cost Per Action) — средняя стоимость одной конверсии: расход ÷ конверсии.',
  conversionValue: 'Суммарная ценность конверсий, переданная в Google Ads.',
  roas: 'ROAS (Return on Ad Spend) — окупаемость рекламы: ценность конверсий ÷ расход. Например, 5× означает 5 единиц ценности на 1 единицу расхода.',
} as const

function KpiCard({
  label,
  description,
  value,
  values,
}: {
  label: string
  description: string
  value?: string
  values?: KpiValue[]
}) {
  const content =
    values?.length === 1 ? (
      <strong className={styles.kpiValue}>{values[0].value}</strong>
    ) : values ? (
      values.length ? (
        <div className={styles.currencyValues}>
          {values.map((item) => (
            <strong key={item.currency} className={styles.currencyValue}>
              {item.value}
            </strong>
          ))}
        </div>
      ) : (
        <strong className={styles.kpiValue}>{EMPTY_VALUE}</strong>
      )
    ) : (
      <strong className={styles.kpiValue}>{value ?? EMPTY_VALUE}</strong>
    )

  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiHeading}>
        <span className={styles.kpiLabel}>{label}</span>
        <Tooltip title={description} trigger={['hover', 'click']}>
          <button type="button" className={styles.kpiHelp} aria-label={`Что означает «${label}»`}>
            <CircleHelp size={14} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
      {content}
    </div>
  )
}

function currencyValues(
  totals: readonly AnalyticsMetricTotal[],
  format: (total: AnalyticsMetricTotal) => string,
): KpiValue[] {
  return totals.map((total) => ({ currency: total.spend.currency, value: format(total) }))
}

function PeriodPicker({
  period,
  customRange,
  onPeriodChange,
  onCustomRangeChange,
}: {
  period: PeriodPreset
  customRange: CustomPeriodRange
  onPeriodChange: (period: PeriodPreset) => void
  onCustomRangeChange: (range: CustomPeriodRange) => void
}) {
  const [open, setOpen] = useState(false)

  const content = (
    <div className={styles.periodMenu} role="menu" aria-label="Период">
      {dashboardPeriodPresets.map((preset) => (
        <button
          key={preset}
          type="button"
          className={preset === period ? styles.periodOptionSelected : undefined}
          role="menuitemradio"
          aria-checked={preset === period}
          onClick={() => {
            onPeriodChange(preset)
            if (preset !== 'custom') setOpen(false)
          }}
        >
          <span>{periodLabels[preset]}</span>
          {preset === period ? <span className={styles.periodCheck}>✓</span> : null}
        </button>
      ))}
      {period === 'custom' ? (
        <div className={styles.customRange}>
          <Input
            aria-label="Дата с"
            type="date"
            max={customRange.to || undefined}
            value={customRange.from}
            onChange={(event) => onCustomRangeChange({ ...customRange, from: event.target.value })}
          />
          <Input
            aria-label="Дата по"
            type="date"
            min={customRange.from || undefined}
            value={customRange.to}
            onChange={(event) => onCustomRangeChange({ ...customRange, to: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <Popover
      content={content}
      open={open}
      placement="bottomLeft"
      trigger="click"
      onOpenChange={setOpen}
    >
      <Button className={styles.filterButton} aria-label="Выбрать период" aria-expanded={open}>
        <CalendarDays size={15} />
        <span className={styles.filterButtonLabel}>{periodLabels[period]}</span>
        <ChevronDown size={12} />
      </Button>
    </Popover>
  )
}

function daysInRange(from: unknown, to: unknown) {
  const start = new Date(`${String(from)}T00:00:00`)
  const end = new Date(`${String(to)}T00:00:00`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
}

export function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const urlFilters = useUrlFilters()
  const period = urlFilters.period
  const fallbackRange = useMemo(() => initialCustomRange(), [])
  const customRange: CustomPeriodRange = useMemo(
    () => ({
      from: urlFilters.filters.from ?? fallbackRange.from,
      to: urlFilters.filters.to ?? fallbackRange.to,
    }),
    [fallbackRange, urlFilters.filters.from, urlFilters.filters.to],
  )

  const accountsQuery = useAdsAccountsQuery({ page: 1, per_page: 100 })
  const accounts = useMemo(() => accountsQuery.data?.data ?? [], [accountsQuery.data])
  const availableAccountIds = useMemo(() => accounts.map((account) => account.id), [accounts])
  const selectedAccountIds = useMemo(
    () => accountIdsFromUrl(urlFilters.filters, availableAccountIds),
    [availableAccountIds, urlFilters.filters],
  )
  const allAccountsInUrl = !urlFilters.filters.ads_account_ids && !urlFilters.filters.ads_account_id
  const allAccountsSelected = accounts.length > 0 && selectedAccountIds.length === accounts.length
  const selectedAccounts = useMemo(
    () => accounts.filter((account) => selectedAccountIds.includes(account.id)),
    [accounts, selectedAccountIds],
  )
  const breakdownFetches = useIsFetching({
    queryKey: queryKeys.entity(serverEntities.analyticsBreakdown),
  })

  const overviewParams = useMemo(
    () =>
      dashboardOverviewQuery(
        period,
        customRange,
        allAccountsInUrl ? undefined : selectedAccountIds,
      ),
    [allAccountsInUrl, customRange, period, selectedAccountIds],
  )
  const overviewQuery = useAnalyticsOverviewQuery(overviewParams ?? {}, {
    enabled: accountsQuery.isSuccess && selectedAccountIds.length > 0 && overviewParams !== null,
  })
  const totals = useMemo(() => overviewQuery.data?.data.totals ?? [], [overviewQuery.data])
  const summary = useMemo(() => summarizeDashboardMetrics(totals), [totals])

  const handleAccountChange = (ids: string[]) => {
    urlFilters.setFilters({
      ads_account_id: null,
      ads_account_ids: accountIdsToUrl(ids, availableAccountIds),
    })
  }

  const rangeLabel = overviewParams
    ? `${formatDashboardDay(String(overviewParams.from))} — ${formatDashboardDay(
        String(overviewParams.to),
      )} · ${daysInRange(overviewParams.from, overviewParams.to)} дн.`
    : 'Укажите корректный диапазон'

  const loadingGrid = (
    <div className={styles.kpiGrid} aria-label="Загрузка KPI">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className={styles.kpiCard}>
          <Skeleton active paragraph={false} title={{ width: index % 2 ? '70%' : '54%' }} />
          <Skeleton active paragraph={false} title={{ width: index % 3 ? '48%' : '62%' }} />
        </div>
      ))}
    </div>
  )

  const kpiContent = () => {
    if (accountsQuery.isPending) return loadingGrid

    if (accountsQuery.isError) {
      return (
        <div className={styles.state}>
          <ApiErrorState error={accountsQuery.error} />
          <Button loading={accountsQuery.isFetching} onClick={() => void accountsQuery.refetch()}>
            Повторить
          </Button>
        </div>
      )
    }

    if (!accounts.length) {
      return (
        <Card className={styles.stateCard}>
          <Empty description="Google Ads аккаунты ещё не добавлены">
            <Button type="primary" onClick={() => navigate(appRoutes.adsAccounts)}>
              Открыть Google Ads Accounts
            </Button>
          </Empty>
        </Card>
      )
    }

    if (!selectedAccountIds.length) {
      return (
        <Card className={styles.stateCard}>
          <Empty description="Выберите один, несколько или все аккаунты">
            <Button
              type="primary"
              onClick={() => urlFilters.setFilters({ ads_account_id: null, ads_account_ids: null })}
            >
              Выбрать все аккаунты
            </Button>
          </Empty>
        </Card>
      )
    }

    if (!overviewParams) {
      return <Alert showIcon type="warning" title="Проверьте произвольный период" />
    }

    if (overviewQuery.isError) {
      return (
        <div className={styles.state}>
          <ApiErrorState error={overviewQuery.error} />
          <Button loading={overviewQuery.isFetching} onClick={() => void overviewQuery.refetch()}>
            Повторить запрос
          </Button>
        </div>
      )
    }

    if (overviewQuery.isPending) return loadingGrid

    if (!totals.length) {
      return (
        <Card className={styles.stateCard}>
          <Empty description="За выбранный период данных нет" />
        </Card>
      )
    }

    return (
      <>
        <div className={styles.kpiGrid}>
          <KpiCard
            label="Расход"
            description={kpiDescriptions.spend}
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoneyCompact(total.spend),
            )}
          />
          <KpiCard
            label="Показы"
            description={kpiDescriptions.impressions}
            value={formatNumber(summary.impressions)}
          />
          <KpiCard
            label="Клики"
            description={kpiDescriptions.clicks}
            value={formatNumber(summary.clicks)}
          />
          <KpiCard
            label="CTR"
            description={kpiDescriptions.ctr}
            value={formatPercent(summary.ctr)}
          />
          <KpiCard
            label="Средний CPC"
            description={kpiDescriptions.averageCpc}
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoney(total.average_cpc),
            )}
          />
          <KpiCard
            label="Конверсии"
            description={kpiDescriptions.conversions}
            value={formatNumber(summary.conversions)}
          />
          <KpiCard
            label="Conversion Rate"
            description={kpiDescriptions.conversionRate}
            value={formatPercent(summary.conversionRate)}
          />
          <KpiCard
            label="CPA"
            description={kpiDescriptions.cpa}
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoneyCompact(total.cpa),
            )}
          />
          <KpiCard
            label="Conversion Value"
            description={kpiDescriptions.conversionValue}
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoneyCompact(total.conversion_value),
            )}
          />
          <KpiCard
            label="ROAS"
            description={kpiDescriptions.roas}
            values={currencyValues(summary.currencyTotals, (total) =>
              total.roas === null ? EMPTY_VALUE : `${formatNumber(total.roas)}×`,
            )}
          />
        </div>
      </>
    )
  }

  return (
    <div className={`${pageStyles.page} ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.titleLine}>
          <h1>Dashboard</h1>
          <span>сводка по выбранным аккаунтам</span>
        </div>
        <Button
          type="primary"
          icon={<RefreshCw size={15} />}
          loading={accountsQuery.isFetching || overviewQuery.isFetching || breakdownFetches > 0}
          onClick={() => {
            void accountsQuery.refetch()
            if (overviewParams && selectedAccountIds.length) void overviewQuery.refetch()
            void queryClient.invalidateQueries({
              queryKey: queryKeys.entity(serverEntities.analyticsBreakdown),
            })
          }}
        >
          Обновить
        </Button>
      </header>

      <div className={styles.controlStrip} aria-label="Фильтры Dashboard">
        <GoogleAdsAccountPicker
          accounts={accounts}
          selectedIds={selectedAccountIds}
          allSelected={allAccountsSelected}
          loading={accountsQuery.isPending}
          onChange={handleAccountChange}
          onSelectAll={() => urlFilters.setFilters({ ads_account_id: null, ads_account_ids: null })}
        />
        <PeriodPicker
          period={period}
          customRange={customRange}
          onPeriodChange={urlFilters.setPeriod}
          onCustomRangeChange={(range) => urlFilters.setFilters({ from: range.from, to: range.to })}
        />
        <span className={styles.rangeLabel}>{rangeLabel}</span>
      </div>

      <section className={styles.kpiSection} aria-label="Ключевые показатели">
        {kpiContent()}
      </section>

      {overviewParams && overviewQuery.isSuccess && totals.length > 0 ? (
        <DashboardInsights query={overviewParams} accounts={selectedAccounts} totals={totals} />
      ) : null}
    </div>
  )
}
