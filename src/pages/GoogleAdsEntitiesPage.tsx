import { Breadcrumb, Button, Card, Empty, Tooltip } from 'antd'
import type { TableColumnsType } from 'antd'
import type { SortOrder as TableSortOrder } from 'antd/es/table/interface'
import { LockKeyhole, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAdsAccountsQuery, useAnalyticsBreakdownListQuery } from '../api/hooks'
import type {
  GoogleAdsEntity,
  AdvertisingMetrics,
  GoogleAdsKeyword,
  GoogleAdsSearchTerm,
  ListEnvelope,
} from '../api/types'
import { GoogleAdsAccountPicker } from '../components/GoogleAdsAccountPicker'
import { ApiErrorState } from '../components/ApiErrorState'
import { ColumnSettings, DataTable, ExportButton, FilterBar, ValueCell } from '../components/list'
import { useColumnPreferences } from '../lib/columnPreferences'
import { formatMoney, formatNumber, formatPercent } from '../lib/format'
import { accountIdsFromUrl, accountIdsToUrl } from '../lib/googleAdsUrlState'
import { useUrlFilters, type UrlFiltersApi } from '../lib/useUrlFilters'
import { appRoutes } from '../routing/routes'
import type { ApiError } from '../services/api'
import pageStyles from './Page.module.css'
import styles from './GoogleAdsEntitiesPage.module.css'
import { entityNavigationSearch, entityQueryFromUrl, searchTermLabel } from './googleAdsEntityPage'
import hierarchyStyles from './CampaignHierarchyPage.module.css'

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

function commonColumns<T extends GoogleAdsEntity>(
  filters: TableSortState,
  accountNames: ReadonlyMap<string, string>,
): TableColumnsType<T> {
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
      key: 'account',
      title: 'Аккаунт',
      render: (_value: unknown, row: T) => (
        <ValueCell
          value={accountNames.get(row.google_ads_account_id) ?? row.google_ads_account_id}
        />
      ),
    },
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
    metric('ctr', labels.ctr, (value) =>
      formatPercent(value === null ? null : Number(value) * 100),
    ),
    metric('average_cpc', labels.average_cpc, formatMoney),
    metric('conversions', labels.conversions, formatNumber),
    metric('conversion_rate', labels.conversion_rate, (value) =>
      formatPercent(value === null ? null : Number(value) * 100),
    ),
    metric('cpa', labels.cpa, formatMoney),
    metric('conversion_value', labels.conversion_value, formatMoney),
    metric('roas', labels.roas, (value) => (value === null ? '—' : `${formatNumber(value)}×`)),
  ]
}

function keywordColumns(
  filters: TableSortState,
  accountNames: ReadonlyMap<string, string>,
): TableColumnsType<GoogleAdsKeyword> {
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
    ...commonColumns<GoogleAdsKeyword>(filters, accountNames),
  ]
}

function searchTermColumns(
  filters: TableSortState,
  accountNames: ReadonlyMap<string, string>,
): TableColumnsType<GoogleAdsSearchTerm> {
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
    ...commonColumns<GoogleAdsSearchTerm>(filters, accountNames),
  ]
}

function EntityTable<T extends GoogleAdsEntity>({
  query,
  columns,
  filters,
  visibleKeys,
  onRowClick,
}: {
  query: UseQueryResult<ListEnvelope<T>, ApiError>
  columns: TableColumnsType<T>
  filters: UrlFiltersApi
  visibleKeys: string[]
  onRowClick?: (row: T) => void
}) {
  const visible = visibleKeys.length
    ? columns.filter((column) => visibleKeys.includes(String(column.key)))
    : columns.slice(0, 1)
  return (
    <DataTable
      query={query}
      columns={visible}
      filters={filters}
      rowKey="id"
      onRowClick={onRowClick}
    />
  )
}

export function GoogleAdsEntitiesPage({ kind }: { kind: PageKind }) {
  const filters = useUrlFilters()
  const navigate = useNavigate()
  const location = useLocation()
  const accounts = useAdsAccountsQuery()
  const accountRows = useMemo(() => accounts.data?.data ?? [], [accounts.data])
  const availableAccountIds = useMemo(() => accountRows.map((account) => account.id), [accountRows])
  const selectedAccountIds = useMemo(
    () => accountIdsFromUrl(filters.filters, availableAccountIds),
    [availableAccountIds, filters.filters],
  )
  const allAccountsInUrl = !filters.filters.ads_account_ids && !filters.filters.ads_account_id
  const allAccountsSelected =
    accountRows.length > 0 && selectedAccountIds.length === availableAccountIds.length
  const accountNames = useMemo(
    () => new Map(accountRows.map((account) => [account.id, account.name])),
    [accountRows],
  )
  const searchKey = kind === 'keywords' ? 'keyword' : 'search_term'
  const queryParams = {
    ...entityQueryFromUrl(filters, searchKey),
    ...(allAccountsInUrl ? {} : { ads_account_ids: selectedAccountIds }),
  }
  const keywords = useAnalyticsBreakdownListQuery<GoogleAdsKeyword>(
    { ...queryParams, group_by: 'keyword' },
    { enabled: kind === 'keywords' && selectedAccountIds.length > 0 },
  )
  const searchTerms = useAnalyticsBreakdownListQuery<GoogleAdsSearchTerm>(
    { ...queryParams, group_by: 'search_term' },
    { enabled: kind === 'search-terms' && selectedAccountIds.length > 0 },
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const tableSort = useMemo(
    () => ({ sort: filters.sort, order: filters.order }),
    [filters.sort, filters.order],
  )
  const allColumns = useMemo(
    () =>
      kind === 'keywords'
        ? keywordColumns(tableSort, accountNames)
        : searchTermColumns(tableSort, accountNames),
    [accountNames, kind, tableSort],
  )
  const columnKeys = useMemo(() => allColumns.map((column) => String(column.key)), [allColumns])
  const preferences = useColumnPreferences(`google-ads.${kind}`, columnKeys)

  const title = kind === 'keywords' ? 'Keywords' : 'Search Terms'
  const groupBy = kind === 'keywords' ? 'keyword' : 'search_term'
  const filterBar = (
    <FilterBar
      filters={filters}
      leading={
        <GoogleAdsAccountPicker
          accounts={accountRows}
          selectedIds={selectedAccountIds}
          allSelected={allAccountsSelected}
          loading={accounts.isPending}
          onChange={(ids) =>
            filters.setFilters({
              ads_account_id: null,
              ads_account_ids: accountIdsToUrl(ids, availableAccountIds),
              campaign_id: null,
              ad_group_id: null,
              ad_id: null,
              keyword: null,
              search_term: null,
            })
          }
          onSelectAll={() =>
            filters.setFilters({
              ads_account_id: null,
              ads_account_ids: null,
              campaign_id: null,
              ad_group_id: null,
              ad_id: null,
              keyword: null,
              search_term: null,
            })
          }
        />
      }
      base={[
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
      more={[
        { key: 'campaign_id', label: 'Campaign ID', text: true },
        { key: 'ad_group_id', label: 'Ad Group ID', text: true },
        { key: 'ad_id', label: 'Ad ID', text: true },
        ...(kind === 'search-terms' ? [{ key: 'keyword', label: 'Keyword ID', text: true }] : []),
        {
          key: 'device',
          label: 'Устройство',
          options: [
            { value: 'DESKTOP', label: 'Компьютеры' },
            { value: 'MOBILE', label: 'Мобильные' },
            { value: 'TABLET', label: 'Планшеты' },
            { value: 'OTHER', label: 'Другие' },
          ],
        },
        { key: 'country', label: 'Страна', text: true },
        { key: 'region', label: 'Регион', text: true },
        { key: 'city', label: 'Город', text: true },
        { key: 'geo_id', label: 'Geo ID', text: true },
      ]}
      search={{
        filterKey: searchKey,
        placeholder: kind === 'keywords' ? 'Найти ключевое слово' : 'Найти поисковый запрос',
      }}
      actions={
        <>
          <Button icon={<Settings2 size={15} />} onClick={() => setSettingsOpen(true)}>
            Колонки
          </Button>
          <ExportButton
            filters={filters}
            groupBy={groupBy}
            columns={preferences.visibleKeys}
            disabled={selectedAccountIds.length === 0}
          />
        </>
      }
    />
  )

  const table = () => {
    if (accounts.isPending) return <Card loading />
    if (accounts.isError) {
      return (
        <div className={hierarchyStyles.state}>
          <ApiErrorState error={accounts.error} />
          <Button onClick={() => void accounts.refetch()}>Повторить</Button>
        </div>
      )
    }
    if (!accountRows.length) return <Empty description="Google Ads аккаунты ещё не добавлены" />
    if (!selectedAccountIds.length) return <Empty description="Выберите Google Ads аккаунты" />

    if (kind === 'keywords') {
      return (
        <EntityTable
          query={keywords}
          columns={allColumns as TableColumnsType<GoogleAdsKeyword>}
          filters={filters}
          visibleKeys={preferences.visibleKeys}
          onRowClick={(row) =>
            navigate({
              pathname: appRoutes.searchTerms,
              search: entityNavigationSearch(location.search, { keyword: row.keyword_id }, [
                'search_term',
              ]),
            })
          }
        />
      )
    }

    return (
      <EntityTable
        query={searchTerms}
        columns={allColumns as TableColumnsType<GoogleAdsSearchTerm>}
        filters={filters}
        visibleKeys={preferences.visibleKeys}
      />
    )
  }

  return (
    <div className={pageStyles.page}>
      <header className={styles.header}>
        <h1 className={pageStyles.title}>{title}</h1>
        <p className={styles.subtitle}>Статистика Google Ads за выбранный период</p>
      </header>
      <Breadcrumb
        className={hierarchyStyles.breadcrumb}
        items={[
          {
            title: (
              <button
                className={hierarchyStyles.breadcrumbLink}
                type="button"
                onClick={() =>
                  navigate({
                    pathname: appRoutes.campaigns,
                    search: entityNavigationSearch(location.search, {}, [
                      'campaign_id',
                      'ad_group_id',
                      'ad_id',
                      'keyword',
                      'search_term',
                    ]),
                  })
                }
              >
                Campaigns
              </button>
            ),
          },
          {
            title: (
              <button
                className={hierarchyStyles.breadcrumbLink}
                type="button"
                onClick={() =>
                  navigate({
                    pathname: appRoutes.adGroups,
                    search: entityNavigationSearch(location.search, {}, [
                      'ad_group_id',
                      'ad_id',
                      'keyword',
                      'search_term',
                    ]),
                  })
                }
              >
                Ad Groups
              </button>
            ),
          },
          {
            title: (
              <button
                className={hierarchyStyles.breadcrumbLink}
                type="button"
                onClick={() =>
                  navigate({
                    pathname: appRoutes.ads,
                    search: entityNavigationSearch(location.search, {}, [
                      'ad_id',
                      'keyword',
                      'search_term',
                    ]),
                  })
                }
              >
                Ads
              </button>
            ),
          },
          ...(kind === 'search-terms'
            ? [
                {
                  title: (
                    <button
                      className={hierarchyStyles.breadcrumbLink}
                      type="button"
                      onClick={() =>
                        navigate({
                          pathname: appRoutes.keywords,
                          search: entityNavigationSearch(location.search, {}, [
                            'keyword',
                            'search_term',
                          ]),
                        })
                      }
                    >
                      Keywords
                    </button>
                  ),
                },
              ]
            : []),
          { title },
        ]}
      />
      <Card className={styles.card} variant="outlined">
        <div className={styles.toolbar}>{filterBar}</div>
        {table()}
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
