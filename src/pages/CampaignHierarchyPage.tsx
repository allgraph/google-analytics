import { Breadcrumb, Button, Card, Empty } from 'antd'
import type { TableColumnsType } from 'antd'
import type { SortOrder as TableSortOrder } from 'antd/es/table/interface'
import { Settings2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  useAdsAccountsQuery,
  useGoogleAdsAdGroupsQuery,
  useGoogleAdsAdsQuery,
  useGoogleAdsCampaignsQuery,
} from '../api/hooks'
import type {
  AdvertisingMetrics,
  GoogleAdsAd,
  GoogleAdsAdGroup,
  GoogleAdsCampaign,
  GoogleAdsEntity,
  ListEnvelope,
} from '../api/types'
import { ApiErrorState } from '../components/ApiErrorState'
import { ColumnSettings, DataTable, FilterBar, ValueCell } from '../components/list'
import { useColumnPreferences } from '../lib/columnPreferences'
import { formatMoney, formatNumber, formatPercent } from '../lib/format'
import { useUrlFilters, type UrlFiltersApi } from '../lib/useUrlFilters'
import { appRoutes } from '../routing/routes'
import type { ApiError } from '../services/api'
import pageStyles from './Page.module.css'
import styles from './GoogleAdsEntitiesPage.module.css'
import hierarchyStyles from './CampaignHierarchyPage.module.css'
import {
  hierarchyEntityQueryFromUrl,
  hierarchyNavigationSearch,
  hierarchyReferenceQueryFromUrl,
  type HierarchyPageKind,
} from './campaignHierarchy'

const pageConfig = {
  campaigns: {
    title: 'Campaigns',
    heading: 'Кампании',
    subtitle: 'Клик по строке открывает группы объявлений',
  },
  'ad-groups': {
    title: 'Ad Groups',
    heading: 'Группы объявлений',
    subtitle: 'Клик по строке открывает объявления группы',
  },
  ads: {
    title: 'Ads',
    heading: 'Объявления',
    subtitle: 'Статистика объявлений за выбранный период',
  },
} as const

const labels: Record<string, string> = {
  account: 'Аккаунт',
  campaign: 'Кампания',
  ad_group: 'Группа',
  campaign_id: 'Campaign ID',
  ad_group_id: 'Ad Group ID',
  ad_id: 'Ad ID',
  name: 'Название',
  type: 'Тип',
  status: 'Статус',
  headline: 'Заголовок',
  impressions: 'Показы',
  clicks: 'Клики',
  ctr: 'CTR',
  average_cpc: 'CPC',
  spend: 'Расход',
  conversions: 'Конверсии',
  cpa: 'CPA',
  conversion_value: 'Conversion Value',
  roas: 'ROAS',
}

const statusLabels = {
  enabled: 'Активно',
  paused: 'Приостановлено',
  removed: 'Удалено',
} as const

type TableSortState = Pick<UrlFiltersApi, 'sort' | 'order'>

function sortOrder(filters: TableSortState, key: string): TableSortOrder {
  return filters.sort === key ? (filters.order === 'asc' ? 'ascend' : 'descend') : null
}

function StatusPill({ status }: { status: GoogleAdsEntity['status'] }) {
  const label = statusLabels[status]
  if (!label) return <ValueCell value={null} />
  return (
    <span className={`${styles.status} ${styles[status]}`}>
      <span className={styles.statusDot} aria-hidden />
      {label}
    </span>
  )
}

function metricColumns<T extends GoogleAdsEntity>(
  filters: TableSortState,
  extended = false,
): TableColumnsType<T> {
  const metric = (
    key: keyof AdvertisingMetrics,
    title: string,
    render: (value: AdvertisingMetrics[keyof AdvertisingMetrics]) => string,
  ) => ({
    key: String(key),
    title,
    sorter: true,
    sortOrder: sortOrder(filters, String(key)),
    align: 'right' as const,
    render: (_value: unknown, row: T) => render(row.metrics[key]),
  })

  const columns: TableColumnsType<T> = [
    metric('impressions', labels.impressions, (value) => formatNumber(value as number)),
    metric('clicks', labels.clicks, (value) => formatNumber(value as number)),
    metric('ctr', labels.ctr, (value) =>
      formatPercent(value === null ? null : (value as number) * 100),
    ),
    metric('average_cpc', labels.average_cpc, (value) =>
      formatMoney(value as AdvertisingMetrics['average_cpc']),
    ),
    metric('spend', labels.spend, (value) => formatMoney(value as AdvertisingMetrics['spend'])),
    metric('conversions', labels.conversions, (value) => formatNumber(value as number)),
    metric('cpa', labels.cpa, (value) => formatMoney(value as AdvertisingMetrics['cpa'])),
  ]

  if (extended) {
    columns.push(
      metric('conversion_value', labels.conversion_value, (value) =>
        formatMoney(value as AdvertisingMetrics['conversion_value']),
      ),
      metric('roas', labels.roas, (value) =>
        value === null ? '—' : `${formatNumber(value as number)}×`,
      ),
    )
  }

  return columns
}

function baseColumns<T extends GoogleAdsEntity>(
  accountNames: ReadonlyMap<string, string>,
): TableColumnsType<T> {
  return [
    {
      key: 'account',
      title: labels.account,
      width: 210,
      render: (_value, row) => (
        <ValueCell
          value={accountNames.get(row.google_ads_account_id) ?? row.google_ads_account_id}
        />
      ),
    },
  ]
}

function campaignColumns(
  filters: TableSortState,
  accountNames: ReadonlyMap<string, string>,
): TableColumnsType<GoogleAdsCampaign> {
  return [
    ...baseColumns<GoogleAdsCampaign>(accountNames),
    {
      key: 'campaign_id',
      title: labels.campaign_id,
      dataIndex: 'campaign_id',
      sorter: true,
      sortOrder: sortOrder(filters, 'campaign_id'),
      className: hierarchyStyles.mono,
    },
    {
      key: 'name',
      title: labels.name,
      dataIndex: 'name',
      fixed: 'left',
      sorter: true,
      sortOrder: sortOrder(filters, 'name'),
      render: (value) => <strong className={hierarchyStyles.entityName}>{value ?? '—'}</strong>,
    },
    {
      key: 'status',
      title: labels.status,
      dataIndex: 'status',
      sorter: true,
      sortOrder: sortOrder(filters, 'status'),
      render: (value) => <StatusPill status={value} />,
    },
    {
      key: 'type',
      title: 'Тип кампании',
      dataIndex: 'type',
      sorter: true,
      sortOrder: sortOrder(filters, 'type'),
      render: (value) => <ValueCell value={value} />,
    },
    ...metricColumns<GoogleAdsCampaign>(filters, true),
  ]
}

function adGroupColumns(
  filters: TableSortState,
  accountNames: ReadonlyMap<string, string>,
  campaignNames: ReadonlyMap<string, string>,
): TableColumnsType<GoogleAdsAdGroup> {
  return [
    ...baseColumns<GoogleAdsAdGroup>(accountNames),
    {
      key: 'campaign_id',
      title: labels.campaign,
      dataIndex: 'campaign_id',
      sorter: true,
      sortOrder: sortOrder(filters, 'campaign_id'),
      render: (value) => <ValueCell value={campaignNames.get(value) ?? value} />,
    },
    {
      key: 'ad_group_id',
      title: labels.ad_group_id,
      dataIndex: 'ad_group_id',
      sorter: true,
      sortOrder: sortOrder(filters, 'ad_group_id'),
      className: hierarchyStyles.mono,
    },
    {
      key: 'name',
      title: labels.name,
      dataIndex: 'name',
      fixed: 'left',
      sorter: true,
      sortOrder: sortOrder(filters, 'name'),
      render: (value) => <strong className={hierarchyStyles.entityName}>{value ?? '—'}</strong>,
    },
    {
      key: 'status',
      title: labels.status,
      dataIndex: 'status',
      sorter: true,
      sortOrder: sortOrder(filters, 'status'),
      render: (value) => <StatusPill status={value} />,
    },
    ...metricColumns<GoogleAdsAdGroup>(filters),
  ]
}

function adColumns(
  filters: TableSortState,
  accountNames: ReadonlyMap<string, string>,
  campaignNames: ReadonlyMap<string, string>,
  adGroupNames: ReadonlyMap<string, string>,
): TableColumnsType<GoogleAdsAd> {
  return [
    ...baseColumns<GoogleAdsAd>(accountNames),
    {
      key: 'campaign_id',
      title: labels.campaign,
      dataIndex: 'campaign_id',
      sorter: true,
      sortOrder: sortOrder(filters, 'campaign_id'),
      render: (value) => <ValueCell value={campaignNames.get(value) ?? value} />,
    },
    {
      key: 'ad_group_id',
      title: labels.ad_group,
      dataIndex: 'ad_group_id',
      sorter: true,
      sortOrder: sortOrder(filters, 'ad_group_id'),
      render: (value) => <ValueCell value={adGroupNames.get(value) ?? value} />,
    },
    {
      key: 'ad_id',
      title: labels.ad_id,
      dataIndex: 'ad_id',
      sorter: true,
      sortOrder: sortOrder(filters, 'ad_id'),
      className: hierarchyStyles.mono,
    },
    {
      key: 'type',
      title: labels.type,
      dataIndex: 'type',
      sorter: true,
      sortOrder: sortOrder(filters, 'type'),
      render: (value) => <ValueCell value={value} />,
    },
    {
      key: 'status',
      title: labels.status,
      dataIndex: 'status',
      sorter: true,
      sortOrder: sortOrder(filters, 'status'),
      render: (value) => <StatusPill status={value} />,
    },
    {
      key: 'name',
      title: labels.headline,
      dataIndex: 'name',
      sorter: true,
      sortOrder: sortOrder(filters, 'name'),
      render: (value) => <ValueCell value={value} />,
    },
    ...metricColumns<GoogleAdsAd>(filters),
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

export function CampaignHierarchyPage({ kind }: { kind: HierarchyPageKind }) {
  const filters = useUrlFilters()
  const { setFilter } = filters
  const navigate = useNavigate()
  const location = useLocation()
  const accountsQuery = useAdsAccountsQuery({ page: 1, per_page: 100 })
  const accounts = useMemo(() => accountsQuery.data?.data ?? [], [accountsQuery.data])
  const accountId = filters.filters.ads_account_id ?? ''

  useEffect(() => {
    if (!accountId && accounts[0]) setFilter('ads_account_id', accounts[0].id)
  }, [accountId, accounts, setFilter])

  const queryParams = hierarchyEntityQueryFromUrl(filters, kind)
  const campaignReferenceParams = hierarchyReferenceQueryFromUrl(filters)
  const adGroupReferenceParams = hierarchyReferenceQueryFromUrl(filters, true)

  const campaignsQuery = useGoogleAdsCampaignsQuery(accountId, queryParams, {
    enabled: kind === 'campaigns' && !!accountId,
  })
  const adGroupsQuery = useGoogleAdsAdGroupsQuery(accountId, queryParams, {
    enabled: kind === 'ad-groups' && !!accountId,
  })
  const adsQuery = useGoogleAdsAdsQuery(accountId, queryParams, {
    enabled: kind === 'ads' && !!accountId,
  })
  const campaignReferences = useGoogleAdsCampaignsQuery(accountId, campaignReferenceParams, {
    enabled: kind !== 'campaigns' && !!accountId,
  })
  const adGroupReferences = useGoogleAdsAdGroupsQuery(accountId, adGroupReferenceParams, {
    enabled: kind === 'ads' && !!accountId,
  })

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  )
  const campaignNames = useMemo(
    () =>
      new Map(
        (campaignReferences.data?.data ?? []).map((campaign) => [
          campaign.campaign_id,
          campaign.name ?? campaign.campaign_id,
        ]),
      ),
    [campaignReferences.data],
  )
  const adGroupNames = useMemo(
    () =>
      new Map(
        (adGroupReferences.data?.data ?? []).map((group) => [
          group.ad_group_id,
          group.name ?? group.ad_group_id,
        ]),
      ),
    [adGroupReferences.data],
  )

  const tableSort = useMemo(
    () => ({ sort: filters.sort, order: filters.order }),
    [filters.sort, filters.order],
  )
  const columns = useMemo(() => {
    if (kind === 'campaigns') return campaignColumns(tableSort, accountNames)
    if (kind === 'ad-groups') return adGroupColumns(tableSort, accountNames, campaignNames)
    return adColumns(tableSort, accountNames, campaignNames, adGroupNames)
  }, [accountNames, adGroupNames, campaignNames, kind, tableSort])
  const columnKeys = useMemo(() => columns.map((column) => String(column.key)), [columns])
  const preferences = useColumnPreferences(`google-ads.${kind}`, columnKeys)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const goTo = (
    pathname: string,
    values: { campaignId?: string | null; adGroupId?: string | null },
  ) => {
    navigate({
      pathname,
      search: hierarchyNavigationSearch(location.search, values),
    })
  }

  const campaignOptions = (campaignReferences.data?.data ?? []).map((campaign) => ({
    value: campaign.campaign_id,
    label: campaign.name ?? campaign.campaign_id,
  }))
  const adGroupOptions = (adGroupReferences.data?.data ?? []).map((group) => ({
    value: group.ad_group_id,
    label: group.name ?? group.ad_group_id,
  }))
  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }))

  const baseFilters = [
    {
      key: 'ads_account_id',
      label: 'Аккаунт',
      options: accountOptions,
      allLabel: accountsQuery.isPending ? 'Загрузка…' : 'Выберите',
      clearOnChange: ['campaign_id', 'ad_group_id', 'ad_id'],
    },
    ...(kind !== 'campaigns'
      ? [
          {
            key: 'campaign_id',
            label: 'Кампания',
            options: campaignOptions,
            allLabel: campaignReferences.isPending ? 'Загрузка…' : 'Все',
            clearOnChange: ['ad_group_id', 'ad_id'],
          },
        ]
      : []),
    ...(kind === 'ads'
      ? [
          {
            key: 'ad_group_id',
            label: 'Группа',
            options: adGroupOptions,
            allLabel: adGroupReferences.isPending ? 'Загрузка…' : 'Все',
          },
        ]
      : []),
    {
      key: 'status',
      label: 'Статус',
      options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
    },
  ]

  const breadcrumbItems =
    kind === 'campaigns'
      ? []
      : [
          {
            title: (
              <button
                className={hierarchyStyles.breadcrumbLink}
                type="button"
                onClick={() => goTo(appRoutes.campaigns, { campaignId: null, adGroupId: null })}
              >
                Campaigns
              </button>
            ),
          },
          ...(kind === 'ads'
            ? [
                {
                  title: (
                    <button
                      className={hierarchyStyles.breadcrumbLink}
                      type="button"
                      onClick={() =>
                        goTo(appRoutes.adGroups, {
                          campaignId: filters.filters.campaign_id,
                          adGroupId: null,
                        })
                      }
                    >
                      Ad Groups
                    </button>
                  ),
                },
              ]
            : []),
          { title: pageConfig[kind].title },
        ]

  const table = () => {
    if (accountsQuery.isPending) return <Card loading />
    if (accountsQuery.isError) {
      return (
        <div className={hierarchyStyles.state}>
          <ApiErrorState error={accountsQuery.error} />
          <Button onClick={() => void accountsQuery.refetch()}>Повторить</Button>
        </div>
      )
    }
    if (!accounts.length) return <Empty description="Google Ads аккаунты ещё не добавлены" />
    if (!accountId) return <Empty description="Выберите Google Ads аккаунт" />

    if (kind === 'campaigns') {
      return (
        <EntityTable
          query={campaignsQuery}
          columns={columns as TableColumnsType<GoogleAdsCampaign>}
          filters={filters}
          visibleKeys={preferences.visibleKeys}
          onRowClick={(row) =>
            goTo(appRoutes.adGroups, { campaignId: row.campaign_id, adGroupId: null })
          }
        />
      )
    }
    if (kind === 'ad-groups') {
      return (
        <EntityTable
          query={adGroupsQuery}
          columns={columns as TableColumnsType<GoogleAdsAdGroup>}
          filters={filters}
          visibleKeys={preferences.visibleKeys}
          onRowClick={(row) =>
            goTo(appRoutes.ads, {
              campaignId: row.campaign_id,
              adGroupId: row.ad_group_id,
            })
          }
        />
      )
    }
    return (
      <EntityTable
        query={adsQuery}
        columns={columns as TableColumnsType<GoogleAdsAd>}
        filters={filters}
        visibleKeys={preferences.visibleKeys}
      />
    )
  }

  return (
    <div className={pageStyles.page}>
      <header className={styles.header}>
        <div className={hierarchyStyles.titleLine}>
          <h1 className={pageStyles.title}>{pageConfig[kind].title}</h1>
          <span>{pageConfig[kind].subtitle}</span>
        </div>
      </header>
      {breadcrumbItems.length ? (
        <Breadcrumb className={hierarchyStyles.breadcrumb} items={breadcrumbItems} />
      ) : null}
      <Card className={styles.card} variant="outlined">
        <div className={styles.toolbar}>
          <FilterBar
            filters={filters}
            base={baseFilters}
            actions={
              <Button icon={<Settings2 size={15} />} onClick={() => setSettingsOpen(true)}>
                Колонки
              </Button>
            }
          />
        </div>
        <div className={hierarchyStyles.tableHeading}>
          <div>
            <h2>{pageConfig[kind].heading}</h2>
            <p>{pageConfig[kind].subtitle}</p>
          </div>
        </div>
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
