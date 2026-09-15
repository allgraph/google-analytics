import { Alert, Button, Card, Empty, Input, Select, Skeleton, Tag } from 'antd'
import type { LucideIcon } from 'lucide-react'
import {
  BadgePercent,
  Banknote,
  ChartNoAxesCombined,
  CircleDollarSign,
  Coins,
  Eye,
  MousePointerClick,
  Percent,
  RefreshCw,
  Target,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdsAccountsQuery, useAnalyticsOverviewQuery } from '../api/hooks'
import type { AnalyticsMetricTotal, GoogleAdsAccount } from '../api/types'
import { ApiErrorState } from '../components/ApiErrorState'
import {
  EMPTY_VALUE,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent,
} from '../lib/format'
import { periodLabels, type PeriodPreset } from '../lib/period'
import { appRoutes } from '../routing/routes'
import pageStyles from './Page.module.css'
import styles from './DashboardPage.module.css'
import {
  dashboardOverviewQuery,
  dashboardPeriodPresets,
  formatDashboardDay,
  summarizeDashboardMetrics,
  type CustomPeriodRange,
} from './dashboard'

const accountStatusLabels: Record<GoogleAdsAccount['connection_status'], string> = {
  connected: 'подключён',
  disconnected: 'отключён',
  error: 'ошибка OAuth',
}

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

function KpiCard({
  label,
  icon: Icon,
  value,
  values,
}: {
  label: string
  icon: LucideIcon
  value?: string
  values?: KpiValue[]
}) {
  return (
    <Card className={styles.kpiCard} variant="outlined">
      <div className={styles.kpiHeader}>
        <span>{label}</span>
        <span className={styles.kpiIcon} aria-hidden>
          <Icon size={16} />
        </span>
      </div>
      {values ? (
        <div className={styles.currencyValues}>
          {values.map((item) => (
            <div key={item.currency} className={styles.currencyValue}>
              <strong>{item.value}</strong>
              <Tag>{item.currency}</Tag>
            </div>
          ))}
        </div>
      ) : (
        <strong className={styles.kpiValue}>{value ?? EMPTY_VALUE}</strong>
      )}
    </Card>
  )
}

function currencyValues(
  totals: readonly AnalyticsMetricTotal[],
  format: (total: AnalyticsMetricTotal) => string,
): KpiValue[] {
  return totals.map((total) => ({ currency: total.spend.currency, value: format(total) }))
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<PeriodPreset>('last30')
  const [customRange, setCustomRange] = useState<CustomPeriodRange>(initialCustomRange)
  const [accountSelection, setAccountSelection] = useState<string[] | null>(null)

  const accountsQuery = useAdsAccountsQuery({ page: 1, per_page: 100 })
  const accounts = useMemo(() => accountsQuery.data?.data ?? [], [accountsQuery.data])
  const selectedAccountIds = useMemo(() => {
    if (accountSelection === null) return accounts.map((account) => account.id)
    const available = new Set(accounts.map((account) => account.id))
    return accountSelection.filter((accountId) => available.has(accountId))
  }, [accountSelection, accounts])
  const allAccountsSelected = accounts.length > 0 && selectedAccountIds.length === accounts.length

  const overviewParams = useMemo(
    () =>
      dashboardOverviewQuery(
        period,
        customRange,
        accountSelection === null ? undefined : selectedAccountIds,
      ),
    [accountSelection, customRange, period, selectedAccountIds],
  )
  const overviewQuery = useAnalyticsOverviewQuery(overviewParams ?? {}, {
    enabled: accountsQuery.isSuccess && selectedAccountIds.length > 0 && overviewParams !== null,
  })
  const totals = useMemo(() => overviewQuery.data?.data.totals ?? [], [overviewQuery.data])
  const summary = useMemo(() => summarizeDashboardMetrics(totals), [totals])

  const handleAccountChange = (ids: string[]) => {
    setAccountSelection(ids.length === accounts.length ? null : ids)
  }

  const rangeLabel = overviewParams
    ? `${formatDashboardDay(String(overviewParams.from))} — ${formatDashboardDay(String(overviewParams.to))}`
    : 'Укажите корректный диапазон'

  const kpiContent = () => {
    if (accountsQuery.isPending) {
      return (
        <div className={styles.kpiGrid} aria-label="Загрузка KPI">
          {Array.from({ length: 10 }, (_, index) => (
            <Card key={index} className={styles.kpiCard}>
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '45%' }} />
            </Card>
          ))}
        </div>
      )
    }

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
            <Button type="primary" onClick={() => setAccountSelection(null)}>
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

    if (overviewQuery.isPending) {
      return (
        <div className={styles.kpiGrid} aria-label="Загрузка KPI">
          {Array.from({ length: 10 }, (_, index) => (
            <Card key={index} className={styles.kpiCard}>
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '45%' }} />
            </Card>
          ))}
        </div>
      )
    }

    if (!totals.length) {
      return (
        <Card className={styles.stateCard}>
          <Empty description="За выбранный период данных нет" />
        </Card>
      )
    }

    return (
      <>
        {summary.currencyTotals.length > 1 ? (
          <Alert
            showIcon
            type="info"
            title="Денежные KPI разделены по валютам"
            description="Суммы, CPC, CPA, Conversion Value и ROAS нельзя корректно объединить без конвертации валют."
          />
        ) : null}
        <div className={styles.kpiGrid}>
          <KpiCard
            label="Расход"
            icon={Banknote}
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoneyCompact(total.spend),
            )}
          />
          <KpiCard label="Показы" icon={Eye} value={formatNumber(summary.impressions)} />
          <KpiCard label="Клики" icon={MousePointerClick} value={formatNumber(summary.clicks)} />
          <KpiCard label="CTR" icon={Percent} value={formatPercent(summary.ctr)} />
          <KpiCard
            label="Средний CPC"
            icon={Coins}
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoney(total.average_cpc),
            )}
          />
          <KpiCard label="Конверсии" icon={Target} value={formatNumber(summary.conversions)} />
          <KpiCard
            label="Conversion Rate"
            icon={BadgePercent}
            value={formatPercent(summary.conversionRate)}
          />
          <KpiCard
            label="CPA"
            icon={CircleDollarSign}
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoneyCompact(total.cpa),
            )}
          />
          <KpiCard
            label="Conversion Value"
            icon={ChartNoAxesCombined}
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoneyCompact(total.conversion_value),
            )}
          />
          <KpiCard
            label="ROAS"
            icon={ChartNoAxesCombined}
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
        <div>
          <h1 className={pageStyles.title}>Dashboard</h1>
          <p>Сводка Google Ads по выбранным аккаунтам и периоду</p>
        </div>
        <Button
          icon={<RefreshCw size={15} />}
          loading={accountsQuery.isFetching || overviewQuery.isFetching}
          onClick={() => {
            void accountsQuery.refetch()
            if (overviewParams && selectedAccountIds.length) void overviewQuery.refetch()
          }}
        >
          Обновить
        </Button>
      </header>

      <Card className={styles.filters} variant="outlined">
        <div className={styles.filterGrid}>
          <div className={styles.filterField}>
            <label htmlFor="dashboard-accounts">Google Ads аккаунты</label>
            <Select
              id="dashboard-accounts"
              mode="multiple"
              allowClear
              maxTagCount={2}
              maxTagPlaceholder={(omitted) =>
                allAccountsSelected ? 'Все аккаунты' : `Ещё: ${omitted.length}`
              }
              placeholder="Выберите аккаунты"
              loading={accountsQuery.isPending}
              value={selectedAccountIds}
              options={accounts.map((account) => ({
                value: account.id,
                label: `${account.name} · ${account.currency_code} · ${accountStatusLabels[account.connection_status]}`,
              }))}
              onChange={handleAccountChange}
            />
            <div className={styles.filterMeta}>
              <span>
                {allAccountsSelected
                  ? `Все аккаунты: ${accounts.length}`
                  : `Выбрано: ${selectedAccountIds.length} из ${accounts.length}`}
              </span>
              {accounts.length ? (
                <Button type="link" size="small" onClick={() => setAccountSelection(null)}>
                  Выбрать все
                </Button>
              ) : null}
            </div>
          </div>

          <div className={styles.filterField}>
            <label htmlFor="dashboard-period">Период</label>
            <Select
              id="dashboard-period"
              value={period}
              options={dashboardPeriodPresets.map((value) => ({
                value,
                label: periodLabels[value],
              }))}
              onChange={setPeriod}
            />
            <span className={styles.rangeLabel}>{rangeLabel}</span>
          </div>

          {period === 'custom' ? (
            <div className={styles.customRange}>
              <div className={styles.filterField}>
                <label htmlFor="dashboard-date-from">Дата с</label>
                <Input
                  id="dashboard-date-from"
                  type="date"
                  max={customRange.to || undefined}
                  value={customRange.from}
                  onChange={(event) =>
                    setCustomRange((current) => ({ ...current, from: event.target.value }))
                  }
                />
              </div>
              <div className={styles.filterField}>
                <label htmlFor="dashboard-date-to">Дата по</label>
                <Input
                  id="dashboard-date-to"
                  type="date"
                  min={customRange.from || undefined}
                  value={customRange.to}
                  onChange={(event) =>
                    setCustomRange((current) => ({ ...current, to: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <section className={styles.kpiSection} aria-labelledby="dashboard-kpi-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="dashboard-kpi-title">Ключевые показатели</h2>
            <p>{rangeLabel}</p>
          </div>
          <Tag color="blue">
            {allAccountsSelected ? 'Все аккаунты' : `Аккаунтов: ${selectedAccountIds.length}`}
          </Tag>
        </div>
        {kpiContent()}
      </section>
    </div>
  )
}
