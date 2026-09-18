import { Button, Card, Select, Tabs } from 'antd'
import type { TableColumnsType } from 'antd'
import { RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import {
  useAdsAccountsQuery,
  useGoogleAdsSyncErrorsQuery,
  useGoogleAdsSyncJobsQuery,
} from '../api/hooks'
import type { GoogleAdsSyncError, GoogleAdsSyncJob } from '../api/types'
import { DataTable } from '../components/list'
import { StatusTag } from '../components/StatusTag'
import { formatDateTime, formatDurationSeconds, formatNumber } from '../lib/format'
import { useUrlFilters } from '../lib/useUrlFilters'
import pageStyles from './Page.module.css'
import styles from './SyncStatusPage.module.css'
import { syncAccountSummary, syncDurationSeconds, syncStatusLabels } from './syncStatus'

const statusDictionary = {
  running: { label: 'Выполняется', tone: 'indigo' },
  success: { label: 'Успешно', tone: 'green' },
  failed: { label: 'Ошибка', tone: 'red' },
} as const

export function SyncStatusPage() {
  const filters = useUrlFilters()
  const accountsQuery = useAdsAccountsQuery()
  const accounts = useMemo(() => accountsQuery.data?.data ?? [], [accountsQuery.data])
  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  )
  const query = {
    page: filters.page,
    per_page: filters.perPage,
    ...(filters.filters.ads_account_id ? { ads_account_id: filters.filters.ads_account_id } : {}),
    ...(filters.filters.status ? { status: filters.filters.status } : {}),
  }
  const jobs = useGoogleAdsSyncJobsQuery(query)
  const errors = useGoogleAdsSyncErrorsQuery({
    page: filters.page,
    per_page: filters.perPage,
    ...(filters.filters.ads_account_id ? { ads_account_id: filters.filters.ads_account_id } : {}),
  })
  const summary = syncAccountSummary(accounts)
  const activeTab = filters.filters.tab === 'errors' ? 'errors' : 'history'

  const accountName = (id: string) => accountNames.get(id) ?? id
  const jobColumns: TableColumnsType<GoogleAdsSyncJob> = [
    {
      key: 'started_at',
      title: 'Запущено',
      dataIndex: 'started_at',
      render: (value: string) => <span className={styles.mono}>{formatDateTime(value)}</span>,
    },
    {
      key: 'account',
      title: 'Аккаунт',
      render: (_value, row) => (
        <span className={styles.account}>{accountName(row.google_ads_account_id)}</span>
      ),
    },
    {
      key: 'status',
      title: 'Статус',
      dataIndex: 'status',
      render: (value: GoogleAdsSyncJob['status']) => (
        <StatusTag dictionary={statusDictionary} code={value} />
      ),
    },
    {
      key: 'duration',
      title: 'Длительность',
      render: (_value, row) =>
        formatDurationSeconds(syncDurationSeconds(row.started_at, row.finished_at)),
    },
    {
      key: 'received',
      title: 'Получено',
      dataIndex: 'received',
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      key: 'inserted',
      title: 'Добавлено',
      dataIndex: 'inserted',
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      key: 'updated',
      title: 'Обновлено',
      dataIndex: 'updated',
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      key: 'error',
      title: 'Ошибка',
      dataIndex: 'error',
      render: (value: string | null) => (
        <span className={value ? styles.error : undefined}>{value || '—'}</span>
      ),
    },
  ]
  const errorColumns: TableColumnsType<GoogleAdsSyncError> = [
    {
      key: 'occurred_at',
      title: 'Время',
      dataIndex: 'occurred_at',
      render: (value: string) => <span className={styles.mono}>{formatDateTime(value)}</span>,
    },
    {
      key: 'account',
      title: 'Аккаунт',
      render: (_value, row) => (
        <span className={styles.account}>{accountName(row.google_ads_account_id)}</span>
      ),
    },
    {
      key: 'sync_job_id',
      title: 'Sync Job ID',
      dataIndex: 'sync_job_id',
      render: (value: string) => (
        <span className={`${styles.mono} ${styles.jobId}`} title={value}>
          {value}
        </span>
      ),
    },
    {
      key: 'error',
      title: 'Ошибка',
      dataIndex: 'error',
      render: (value: string) => <span className={styles.error}>{value}</span>,
    },
  ]

  const refresh = () =>
    void Promise.all([accountsQuery.refetch(), jobs.refetch(), errors.refetch()])
  const cards = [
    ['connected', 'Подключены', summary.connected, styles.green],
    ['running', 'Синхронизируются', summary.running, styles.indigo],
    ['failed', 'С ошибкой', summary.failed, styles.red],
    ['stale', 'Данные устарели', summary.stale, styles.amber],
  ] as const

  return (
    <div className={pageStyles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={pageStyles.title}>Sync / System Status</h1>
          <p className={styles.subtitle}>Состояние и история синхронизации Google Ads</p>
        </div>
        <Button
          icon={<RefreshCw size={15} />}
          loading={jobs.isFetching || errors.isFetching}
          onClick={refresh}
        >
          Обновить
        </Button>
      </header>

      <div className={styles.summary}>
        {cards.map(([key, label, value, tone]) => (
          <Card key={key} loading={accountsQuery.isLoading} className={styles.summaryCard}>
            <span className={`${styles.summaryDot} ${tone}`} />
            <div>
              <div className={styles.summaryLabel}>{label}</div>
              <strong className={styles.summaryValue}>{value}</strong>
            </div>
          </Card>
        ))}
      </div>

      <Card className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarTitle}>
            <h2>Журнал синхронизаций</h2>
            <p>Каждый аккаунт обрабатывается независимо</p>
          </div>
          <Select
            allowClear
            className={styles.accountSelect}
            loading={accountsQuery.isLoading}
            placeholder="Все аккаунты"
            value={filters.filters.ads_account_id}
            options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            onChange={(value) => filters.setFilter('ads_account_id', value ?? null)}
          />
          {activeTab === 'history' ? (
            <Select
              allowClear
              className={styles.statusSelect}
              placeholder="Все статусы"
              value={filters.filters.status}
              options={Object.entries(syncStatusLabels).map(([value, label]) => ({ value, label }))}
              onChange={(value) => filters.setFilter('status', value ?? null)}
            />
          ) : null}
        </div>
        <Tabs
          className={styles.tabs}
          activeKey={activeTab}
          onChange={(tab) =>
            filters.setFilters({ tab: tab === 'errors' ? 'errors' : null, status: null })
          }
          items={[
            {
              key: 'history',
              label: 'История запусков',
              children: (
                <DataTable
                  query={jobs}
                  columns={jobColumns}
                  filters={filters}
                  rowKey="id"
                  emptyText="Запусков синхронизации пока нет"
                />
              ),
            },
            {
              key: 'errors',
              label: 'Ошибки',
              children: (
                <DataTable
                  query={errors}
                  columns={errorColumns}
                  filters={filters}
                  rowKey={(row) => `${row.sync_job_id}-${row.occurred_at}`}
                  emptyText="Ошибок синхронизации нет"
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
