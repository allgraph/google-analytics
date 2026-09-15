import { Button, Card, Tooltip } from 'antd'
import type { TableColumnsType } from 'antd'
import type { SortOrder as TableSortOrder } from 'antd/es/table/interface'
import { LockKeyhole, Settings2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import {
  useAdsAccountsQuery,
  useGoogleAdsKeywordsQuery,
  useGoogleAdsSearchTermsQuery,
} from '../api/hooks'
import type {
  GoogleAdsEntity,
  AdvertisingMetrics,
  GoogleAdsKeyword,
  GoogleAdsSearchTerm,
  ListEnvelope,
} from '../api/types'
import { ColumnSettings, DataTable, FilterBar, ValueCell } from '../components/list'
import { useColumnPreferences } from '../lib/columnPreferences'
import { formatMoney, formatNumber, formatPercent } from '../lib/format'
import { useUrlFilters, type UrlFiltersApi } from '../lib/useUrlFilters'
import type { ApiError } from '../services/api'
import pageStyles from './Page.module.css'
import styles from './GoogleAdsEntitiesPage.module.css'
import { entityQueryFromUrl, searchTermLabel } from './googleAdsEntityPage'

type PageKind = 'keywords' | 'search-terms'

const labels = {
  name: 'Ключевое слово',
  search_term: 'Поисковый запрос',
  match_type: 'Тип соответствия',
  status: 'Статус',
  campaign_id: 'Campaign ID',
  ad_group_id: 'Ad Group ID',
  keyword_id: 'Keyword ID',
  spend: 'Расход',
  impressions: 'Показы',
  clicks: 'Клики',
  ctr: 'CTR',
  average_cpc: 'Средний CPC',
  conversions: 'Конверсии',
  conversion_rate: 'Коэф. конверсии',
  cpa: 'CPA',
  conversion_value: 'Ценность конверсий',
  roas: 'ROAS',
} as const

const matchLabels = { broad: 'Широкое', phrase: 'Фразовое', exact: 'Точное' } as const
const statusLabels = { enabled: 'Активно', paused: 'Приостановлено', removed: 'Удалено' } as const

type TableSortState = Pick<UrlFiltersApi, 'sort' | 'order'>

/** Статус-пилюля из прототипа: точка + подпись, цвет по состоянию. */
function StatusPill({ status }: { status: keyof typeof statusLabels }) {
  if (!statusLabels[status]) return <ValueCell value={null} />
  return (
    <span className={`${styles.status} ${styles[status]}`}>
      <span className={styles.statusDot} aria-hidden />
      {statusLabels[status]}
    </span>
  )
}

function sortOrder(filters: TableSortState, key: string): TableSortOrder {
  return filters.sort === key ? (filters.order === 'asc' ? 'ascend' : 'descend') : null
}

function commonColumns<T extends GoogleAdsEntity>(filters: TableSortState): TableColumnsType<T> {
  const metric = (
    key: keyof AdvertisingMetrics,
    title: string,
    render: (value: never) => string,
  ) => ({
    key: String(key),
    title,
    sorter: true,
    sortOrder: sortOrder(filters, String(key)),
    align: 'right' as const,
    render: (_value: unknown, row: T) => render(row.metrics[key] as never),
  })
  return [
    {
      key: 'match_type',
      title: labels.match_type,
      dataIndex: 'match_type',
      sorter: true,
      sortOrder: sortOrder(filters, 'match_type'),
      render: (value) => (
        <ValueCell value={value ? matchLabels[value as keyof typeof matchLabels] : null} />
      ),
    },
    {
      key: 'status',
      title: labels.status,
      dataIndex: 'status',
      sorter: true,
      sortOrder: sortOrder(filters, 'status'),
      render: (value) => <StatusPill status={value as keyof typeof statusLabels} />,
    },
    {
      key: 'campaign_id',
      title: labels.campaign_id,
      dataIndex: 'campaign_id',
      sorter: true,
      sortOrder: sortOrder(filters, 'campaign_id'),
    },
    {
      key: 'ad_group_id',
      title: labels.ad_group_id,
      dataIndex: 'ad_group_id',
      sorter: true,
      sortOrder: sortOrder(filters, 'ad_group_id'),
    },
    {
      key: 'keyword_id',
      title: labels.keyword_id,
      dataIndex: 'keyword_id',
      sorter: true,
      sortOrder: sortOrder(filters, 'keyword_id'),
    },
    metric('spend', labels.spend, formatMoney),
    metric('impressions', labels.impressions, formatNumber),
    metric('clicks', labels.clicks, formatNumber),
    metric('ctr', labels.ctr, formatPercent),
    metric('average_cpc', labels.average_cpc, formatMoney),
    metric('conversions', labels.conversions, formatNumber),
    metric('conversion_rate', labels.conversion_rate, formatPercent),
    metric('cpa', labels.cpa, formatMoney),
    metric('conversion_value', labels.conversion_value, formatMoney),
    metric('roas', labels.roas, (value) => (value === null ? '—' : `${formatNumber(value)}×`)),
  ]
}

function keywordColumns(filters: TableSortState): TableColumnsType<GoogleAdsKeyword> {
  return [
    {
      key: 'name',
      title: labels.name,
      dataIndex: 'name',
      fixed: 'left',
      sorter: true,
      sortOrder: sortOrder(filters, 'name'),
      render: (value) => <ValueCell value={value} />,
    },
    ...commonColumns<GoogleAdsKeyword>(filters),
  ]
}

function searchTermColumns(filters: TableSortState): TableColumnsType<GoogleAdsSearchTerm> {
  return [
    {
      key: 'search_term',
      title: labels.search_term,
      dataIndex: 'name',
      fixed: 'left',
      sorter: true,
      sortOrder: sortOrder(filters, 'search_term'),
      render: (_value, row) =>
        row.privacy_restricted ? (
          <Tooltip title="Google Ads скрыл запрос по требованиям конфиденциальности">
            <span className={styles.privacy}>
              <LockKeyhole size={14} />
              Скрыто Google Ads
            </span>
          </Tooltip>
        ) : (
          <ValueCell value={searchTermLabel(row)} />
        ),
    },
    ...commonColumns<GoogleAdsSearchTerm>(filters),
  ]
}

function EntityTable<T extends GoogleAdsEntity>({
  query,
  columns,
  filters,
  visibleKeys,
}: {
  query: UseQueryResult<ListEnvelope<T>, ApiError>
  columns: TableColumnsType<T>
  filters: UrlFiltersApi
  visibleKeys: string[]
}) {
  const visible = visibleKeys.length
    ? columns.filter((column) => visibleKeys.includes(String(column.key)))
    : columns.slice(0, 1)
  return <DataTable query={query} columns={visible} filters={filters} rowKey="id" />
}

export function GoogleAdsEntitiesPage({ kind }: { kind: PageKind }) {
  const filters = useUrlFilters()
  const { setFilter } = filters
  const accounts = useAdsAccountsQuery()
  const accountId = filters.filters.ads_account_id ?? ''
  const searchKey = kind === 'keywords' ? 'keyword' : 'search_term'
  const queryParams = entityQueryFromUrl(filters, searchKey)
  const keywords = useGoogleAdsKeywordsQuery(accountId, queryParams, {
    enabled: kind === 'keywords' && !!accountId,
  })
  const searchTerms = useGoogleAdsSearchTermsQuery(accountId, queryParams, {
    enabled: kind === 'search-terms' && !!accountId,
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const tableSort = useMemo(
    () => ({ sort: filters.sort, order: filters.order }),
    [filters.sort, filters.order],
  )
  const allColumns = useMemo(
    () => (kind === 'keywords' ? keywordColumns(tableSort) : searchTermColumns(tableSort)),
    [kind, tableSort],
  )
  const columnKeys = useMemo(() => allColumns.map((column) => String(column.key)), [allColumns])
  const preferences = useColumnPreferences(`google-ads.${kind}`, columnKeys)

  useEffect(() => {
    if (!accountId && accounts.data?.data[0]) setFilter('ads_account_id', accounts.data.data[0].id)
  }, [accountId, accounts.data, setFilter])

  const title = kind === 'keywords' ? 'Keywords' : 'Search Terms'
  const accountOptions =
    accounts.data?.data.map((account) => ({ value: account.id, label: account.name })) ?? []
  const filterBar = (
    <FilterBar
      filters={filters}
      base={[
        {
          key: 'ads_account_id',
          label: 'Аккаунт',
          options: accountOptions,
          allLabel: accounts.isPending ? 'Загрузка…' : 'Выберите',
        },
        {
          key: 'status',
          label: 'Статус',
          options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
        },
        {
          key: 'match_type',
          label: 'Соответствие',
          options: Object.entries(matchLabels).map(([value, label]) => ({ value, label })),
        },
      ]}
      search={{
        filterKey: searchKey,
        placeholder: kind === 'keywords' ? 'Найти ключевое слово' : 'Найти поисковый запрос',
      }}
      actions={
        <Button icon={<Settings2 size={15} />} onClick={() => setSettingsOpen(true)}>
          Колонки
        </Button>
      }
    />
  )

  return (
    <div className={pageStyles.page}>
      <header className={styles.header}>
        <h1 className={pageStyles.title}>{title}</h1>
        <p className={styles.subtitle}>Статистика Google Ads за выбранный период</p>
      </header>
      <Card className={styles.card} variant="outlined">
        <div className={styles.toolbar}>{filterBar}</div>
        {kind === 'keywords' ? (
          <EntityTable
            query={keywords}
            columns={allColumns as TableColumnsType<GoogleAdsKeyword>}
            filters={filters}
            visibleKeys={preferences.visibleKeys}
          />
        ) : (
          <EntityTable
            query={searchTerms}
            columns={allColumns as TableColumnsType<GoogleAdsSearchTerm>}
            filters={filters}
            visibleKeys={preferences.visibleKeys}
          />
        )}
      </Card>
      <ColumnSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={preferences.preferences}
        setPreferences={preferences.setPreferences}
        labels={labels}
      />
    </div>
  )
}
