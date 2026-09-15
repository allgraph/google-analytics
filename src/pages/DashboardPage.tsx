import { Alert, Button, Card, Empty, Input, Popover, Skeleton } from 'antd'
import { CalendarDays, ChevronDown, RefreshCw, UsersRound } from 'lucide-react'
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

function KpiCard({ label, value, values }: { label: string; value?: string; values?: KpiValue[] }) {
  if (values?.length === 1) {
    return (
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>{label}</span>
        <strong className={styles.kpiValue}>{values[0].value}</strong>
      </div>
    )
  }

  return (
    <div className={styles.kpiCard}>
      <span className={styles.kpiLabel}>{label}</span>
      {values ? (
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
      )}
    </div>
  )
}

function currencyValues(
  totals: readonly AnalyticsMetricTotal[],
  format: (total: AnalyticsMetricTotal) => string,
): KpiValue[] {
  return totals.map((total) => ({ currency: total.spend.currency, value: format(total) }))
}

function AccountPicker({
  accounts,
  selectedIds,
  allSelected,
  loading,
  onChange,
  onSelectAll,
}: {
  accounts: GoogleAdsAccount[]
  selectedIds: string[]
  allSelected: boolean
  loading: boolean
  onChange: (ids: string[]) => void
  onSelectAll: () => void
}) {
  const [open, setOpen] = useState(false)
  const selected = new Set(selectedIds)
  const label = allSelected
    ? 'Все аккаунты'
    : selectedIds.length === 0
      ? 'Аккаунты не выбраны'
      : selectedIds.length === 1
        ? (accounts.find((account) => account.id === selectedIds[0])?.name ?? '1 аккаунт')
        : `Аккаунтов: ${selectedIds.length}`

  const toggleAccount = (accountId: string) => {
    const nextIds = selected.has(accountId)
      ? selectedIds.filter((id) => id !== accountId)
      : [...selectedIds, accountId]
    onChange(nextIds)
  }

  const content = (
    <div className={styles.accountMenu} role="menu" aria-label="Google Ads аккаунты">
      <div className={styles.accountMenuActions}>
        <button type="button" onClick={onSelectAll}>
          Все аккаунты
        </button>
        <button type="button" onClick={() => onChange([])}>
          Снять всё
        </button>
      </div>
      <div className={styles.accountMenuList}>
        {accounts.map((account) => {
          const checked = selected.has(account.id)
          return (
            <button
              key={account.id}
              type="button"
              className={checked ? styles.accountOptionSelected : undefined}
              role="menuitemcheckbox"
              aria-checked={checked}
              onClick={() => toggleAccount(account.id)}
            >
              <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
              <span className={styles.accountName}>{account.name}</span>
              <span
                className={`${styles.statusDot} ${styles[account.connection_status]}`}
                title={accountStatusLabels[account.connection_status]}
                aria-label={accountStatusLabels[account.connection_status]}
              />
              <span className={styles.customerId}>{account.google_ads_customer_id}</span>
            </button>
          )
        })}
      </div>
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
      <Button
        className={`${styles.filterButton} ${!allSelected ? styles.filterButtonActive : ''}`}
        disabled={!accounts.length}
        loading={loading}
        aria-label="Выбрать Google Ads аккаунты"
        aria-expanded={open}
      >
        <UsersRound size={15} />
        <span className={styles.filterButtonLabel}>{label}</span>
        <ChevronDown size={12} />
      </Button>
    </Popover>
  )
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
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoneyCompact(total.spend),
            )}
          />
          <KpiCard label="Показы" value={formatNumber(summary.impressions)} />
          <KpiCard label="Клики" value={formatNumber(summary.clicks)} />
          <KpiCard label="CTR" value={formatPercent(summary.ctr)} />
          <KpiCard
            label="Средний CPC"
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoney(total.average_cpc),
            )}
          />
          <KpiCard label="Конверсии" value={formatNumber(summary.conversions)} />
          <KpiCard label="Conversion Rate" value={formatPercent(summary.conversionRate)} />
          <KpiCard
            label="CPA"
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoneyCompact(total.cpa),
            )}
          />
          <KpiCard
            label="Conversion Value"
            values={currencyValues(summary.currencyTotals, (total) =>
              formatMoneyCompact(total.conversion_value),
            )}
          />
          <KpiCard
            label="ROAS"
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
          loading={accountsQuery.isFetching || overviewQuery.isFetching}
          onClick={() => {
            void accountsQuery.refetch()
            if (overviewParams && selectedAccountIds.length) void overviewQuery.refetch()
          }}
        >
          Обновить
        </Button>
      </header>

      <div className={styles.controlStrip} aria-label="Фильтры Dashboard">
        <AccountPicker
          accounts={accounts}
          selectedIds={selectedAccountIds}
          allSelected={allAccountsSelected}
          loading={accountsQuery.isPending}
          onChange={handleAccountChange}
          onSelectAll={() => setAccountSelection(null)}
        />
        <PeriodPicker
          period={period}
          customRange={customRange}
          onPeriodChange={setPeriod}
          onCustomRangeChange={setCustomRange}
        />
        <span className={styles.rangeLabel}>{rangeLabel}</span>
      </div>

      <section className={styles.kpiSection} aria-label="Ключевые показатели">
        {kpiContent()}
      </section>
    </div>
  )
}
