import { Alert, Button, Card, Empty, Skeleton } from 'antd'
import type { TableColumnsType } from 'antd'
import type { SortOrder as TableSortOrder } from 'antd/es/table/interface'
import { Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAdsAccountsQuery, useAnalyticsBreakdownListQuery } from '../api/hooks'
import type {
  AdvertisingMetrics,
  GoogleAdsAdGroup,
  GoogleAdsCampaign,
  GoogleAdsDeviceRow,
  GoogleAdsDimension,
  GoogleAdsGeoRow,
} from '../api/types'
import { ApiErrorState } from '../components/ApiErrorState'
import { GoogleAdsAccountPicker } from '../components/GoogleAdsAccountPicker'
import { ColumnSettings, DataTable, ExportButton, FilterBar, ValueCell } from '../components/list'
import { dictionaryOptions, devices, getLabel, type DeviceCode } from '../lib/dictionaries'
import { useColumnPreferences } from '../lib/columnPreferences'
import { formatMoney, formatNumber, formatPercent } from '../lib/format'
import { accountIdsFromUrl, accountIdsToUrl } from '../lib/googleAdsUrlState'
import { useUrlFilters, type UrlFiltersApi } from '../lib/useUrlFilters'
import pageStyles from './Page.module.css'
import entityStyles from './GoogleAdsEntitiesPage.module.css'
import styles from './GoogleAdsDimensionsPage.module.css'
import { hierarchyReferenceQueryFromUrl } from './campaignHierarchy'
import {
  columnsInPreferenceOrder,
  dimensionQueryFromUrl,
  dimensionReferenceQueryFromUrl,
  dimensionRowKey,
  type DimensionPageKind,
} from './googleAdsDimensionPage'

const pageConfig = {
  geography: {
    title: 'Geography',
    heading: 'География показов',
    subtitle: 'Разрез по географическому таргетингу Google Ads',
    groupBy: 'geography' as const,
  },
  devices: {
    title: 'Devices',
    heading: 'Разрез по устройствам',
    subtitle: 'Desktop, Mobile, Tablet и Other',
    groupBy: 'device' as const,
  },
} as const

const columnLabels: Record<string, string> = {
  account: 'Аккаунт',
  country: 'Страна',
  region: 'Регион',
  city: 'Город',
  geo_id: 'Google Geo ID',
  device: 'Устройство',
  impressions: 'Показы',
  clicks: 'Клики',
  ctr: 'CTR',
  average_cpc: 'CPC',
  spend: 'Расход',
  conversions: 'Конверсии',
  cpa: 'CPA',
}

const countryLabels: Record<string, string> = {
  DE: 'Германия',
  AT: 'Австрия',
  CH: 'Швейцария',
}

type TableSortState = Pick<UrlFiltersApi, 'sort' | 'order'>

function sortOrder(filters: TableSortState, key: string): TableSortOrder {
  return filters.sort === key ? (filters.order === 'asc' ? 'ascend' : 'descend') : null
}

function metricColumns<T extends GoogleAdsDimension>(filters: TableSortState): TableColumnsType<T> {
  const metric = (
    key: keyof AdvertisingMetrics,
    render: (value: AdvertisingMetrics[keyof AdvertisingMetrics]) => string,
  ) => ({
    key: String(key),
    title: columnLabels[String(key)],
    sorter: true,
    sortOrder: sortOrder(filters, String(key)),
    align: 'right' as const,
    render: (_value: unknown, row: T) => render(row.metrics[key]),
  })

  return [
    metric('impressions', (value) => formatNumber(value as number)),
    metric('clicks', (value) => formatNumber(value as number)),
    metric('ctr', (value) => formatPercent(value === null ? null : Number(value) * 100)),
    metric('average_cpc', (value) => formatMoney(value as AdvertisingMetrics['average_cpc'])),
    metric('spend', (value) => formatMoney(value as AdvertisingMetrics['spend'])),
    metric('conversions', (value) => formatNumber(value as number)),
    metric('cpa', (value) => formatMoney(value as AdvertisingMetrics['cpa'])),
  ]
}

function accountColumn<T extends GoogleAdsDimension>(
  accountNames: ReadonlyMap<string, string>,
): TableColumnsType<T> {
  return [
    {
      key: 'account',
      title: columnLabels.account,
      fixed: 'left',
      width: 210,
      render: (_value, row) => (
        <ValueCell
          value={accountNames.get(row.google_ads_account_id) ?? row.google_ads_account_id}
        />
      ),
    },
  ]
}

function geographyColumns(
  filters: TableSortState,
  accountNames: ReadonlyMap<string, string>,
): TableColumnsType<GoogleAdsGeoRow> {
  const field = (key: 'country' | 'region' | 'city' | 'geo_id') => ({
    key,
    title: columnLabels[key],
    dataIndex: key,
    sorter: true,
    sortOrder: sortOrder(filters, key),
    render: (value: string | null) => (
      <ValueCell value={key === 'country' && value ? (countryLabels[value] ?? value) : value} />
    ),
  })
  return [
    ...accountColumn<GoogleAdsGeoRow>(accountNames),
    field('country'),
    field('region'),
    field('city'),
    { ...field('geo_id'), className: styles.mono },
    ...metricColumns<GoogleAdsGeoRow>(filters),
  ]
}

function deviceColumns(
  filters: TableSortState,
  accountNames: ReadonlyMap<string, string>,
): TableColumnsType<GoogleAdsDeviceRow> {
  return [
    ...accountColumn<GoogleAdsDeviceRow>(accountNames),
    {
      key: 'device',
      title: columnLabels.device,
      dataIndex: 'device',
      fixed: 'left',
      sorter: true,
      sortOrder: sortOrder(filters, 'device'),
      render: (value: string) => <strong>{getLabel(devices, value) ?? value}</strong>,
    },
    ...metricColumns<GoogleAdsDeviceRow>(filters),
  ]
}

function uniqueOptions(
  values: Array<string | null | undefined>,
  label?: (value: string) => string,
) {
  return [...new Set(values.filter((value): value is string => !!value))]
    .sort((left, right) => (label?.(left) ?? left).localeCompare(label?.(right) ?? right, 'ru'))
    .map((value) => ({ value, label: label?.(value) ?? value }))
}

interface DeviceSummary {
  code: DeviceCode
  spend: string
  clicks: number
  conversions: number
  cpa: string
}

function moneyLabel(amounts: Map<string, number>): string {
  if (!amounts.size) return '—'
  return [...amounts.entries()]
    .map(([currency, amount]) => formatMoney({ amount: amount.toFixed(2), currency }))
    .join(' + ')
}

function deviceSummaries(rows: readonly GoogleAdsDeviceRow[]): DeviceSummary[] {
  return (['DESKTOP', 'MOBILE', 'TABLET', 'OTHER'] as const).map((code) => {
    const selected = rows.filter((row) => row.device === code)
    const spends = new Map<string, number>()
    const cpaParts = new Map<string, { spend: number; conversions: number }>()
    for (const row of selected) {
      const currency = row.metrics.spend.currency
      const spend = Number(row.metrics.spend.amount)
      spends.set(currency, (spends.get(currency) ?? 0) + spend)
      const current = cpaParts.get(currency) ?? { spend: 0, conversions: 0 }
      current.spend += spend
      current.conversions += row.metrics.conversions
      cpaParts.set(currency, current)
    }
    const cpas = new Map<string, number>()
    for (const [currency, values] of cpaParts) {
      if (values.conversions) cpas.set(currency, values.spend / values.conversions)
    }
    return {
      code,
      spend: moneyLabel(spends),
      clicks: selected.reduce((sum, row) => sum + row.metrics.clicks, 0),
      conversions: selected.reduce((sum, row) => sum + row.metrics.conversions, 0),
      cpa: moneyLabel(cpas),
    }
  })
}

function DeviceCards({ rows, loading }: { rows: readonly GoogleAdsDeviceRow[]; loading: boolean }) {
  if (loading)
    return (
      <div className={styles.deviceGrid}>
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} size="small">
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        ))}
      </div>
    )
  return (
    <div className={styles.deviceGrid}>
      {deviceSummaries(rows).map((summary) => (
        <Card key={summary.code} size="small" className={styles.deviceCard}>
          <div className={styles.deviceTitle}>{getLabel(devices, summary.code)}</div>
          <div className={styles.deviceSpend}>{summary.spend}</div>
          <div className={styles.deviceMeta}>
            {formatNumber(summary.clicks)} кликов · {formatNumber(summary.conversions)} конверсий
          </div>
          <div className={styles.deviceMeta}>CPA {summary.cpa}</div>
        </Card>
      ))}
    </div>
  )
}

export function GoogleAdsDimensionsPage({ kind }: { kind: DimensionPageKind }) {
  const config = pageConfig[kind]
  const filters = useUrlFilters()
  const accountsQuery = useAdsAccountsQuery({ page: 1, per_page: 100 })
  const accounts = useMemo(() => accountsQuery.data?.data ?? [], [accountsQuery.data])
  const availableAccountIds = useMemo(() => accounts.map((account) => account.id), [accounts])
  const selectedAccountIds = useMemo(
    () => accountIdsFromUrl(filters.filters, availableAccountIds),
    [availableAccountIds, filters.filters],
  )
  const allAccountsInUrl = !filters.filters.ads_account_ids && !filters.filters.ads_account_id
  const allAccountsSelected =
    accounts.length > 0 && selectedAccountIds.length === availableAccountIds.length
  const accountScope = allAccountsInUrl ? {} : { ads_account_ids: selectedAccountIds }
  const enabled =
    !accountsQuery.isPending && !accountsQuery.isError && selectedAccountIds.length > 0

  const queryParams = {
    ...dimensionQueryFromUrl(filters, kind),
    ...accountScope,
    group_by: config.groupBy,
  }
  const tableQuery = useAnalyticsBreakdownListQuery<GoogleAdsGeoRow | GoogleAdsDeviceRow>(
    queryParams,
    { enabled },
  )
  const campaignReferences = useAnalyticsBreakdownListQuery<GoogleAdsCampaign>(
    { ...hierarchyReferenceQueryFromUrl(filters), ...accountScope, group_by: 'campaign' },
    { enabled },
  )
  const adGroupReferences = useAnalyticsBreakdownListQuery<GoogleAdsAdGroup>(
    { ...hierarchyReferenceQueryFromUrl(filters, true), ...accountScope, group_by: 'ad_group' },
    { enabled },
  )
  const geographyReferences = useAnalyticsBreakdownListQuery<GoogleAdsGeoRow>(
    { ...dimensionReferenceQueryFromUrl(filters), ...accountScope, group_by: 'geography' },
    { enabled: enabled && kind === 'geography' },
  )
  const deviceSummaryQuery = useAnalyticsBreakdownListQuery<GoogleAdsDeviceRow>(
    { ...dimensionReferenceQueryFromUrl(filters), ...accountScope, group_by: 'device' },
    { enabled: enabled && kind === 'devices' },
  )

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  )
  const tableSort = useMemo(
    () => ({ sort: filters.sort, order: filters.order }),
    [filters.sort, filters.order],
  )
  const allColumns = useMemo<TableColumnsType<GoogleAdsGeoRow | GoogleAdsDeviceRow>>(
    () =>
      kind === 'geography'
        ? (geographyColumns(tableSort, accountNames) as TableColumnsType<
            GoogleAdsGeoRow | GoogleAdsDeviceRow
          >)
        : (deviceColumns(tableSort, accountNames) as TableColumnsType<
            GoogleAdsGeoRow | GoogleAdsDeviceRow
          >),
    [accountNames, kind, tableSort],
  )
  const columnKeys = useMemo(() => allColumns.map((column) => String(column.key)), [allColumns])
  const preferences = useColumnPreferences(`google-ads.${kind}`, columnKeys)
  const visibleColumns = useMemo(
    () => columnsInPreferenceOrder(allColumns, preferences.visibleKeys),
    [allColumns, preferences.visibleKeys],
  )
  const [settingsOpen, setSettingsOpen] = useState(false)

  const campaignOptions = (campaignReferences.data?.data ?? []).map((campaign) => ({
    value: campaign.campaign_id,
    label: campaign.name ?? campaign.campaign_id,
  }))
  const adGroupOptions = (adGroupReferences.data?.data ?? []).map((group) => ({
    value: group.ad_group_id,
    label: group.name ?? group.ad_group_id,
  }))
  const geoRows = geographyReferences.data?.data ?? []
  const countryOptions = uniqueOptions(
    geoRows.map((row) => row.country),
    (code) => countryLabels[code] ?? code,
  )
  const regionRows = geoRows.filter(
    (row) => !filters.filters.country || row.country === filters.filters.country,
  )
  const cityRows = regionRows.filter(
    (row) => !filters.filters.region || row.region === filters.filters.region,
  )
  const geoIdRows = cityRows.filter(
    (row) => !filters.filters.city || row.city === filters.filters.city,
  )

  const hierarchyFilters = [
    {
      key: 'campaign_id',
      label: 'Кампания',
      options: campaignOptions,
      allLabel: campaignReferences.isPending ? 'Загрузка…' : 'Все',
      clearOnChange: ['ad_group_id'],
    },
    {
      key: 'ad_group_id',
      label: 'Группа',
      options: adGroupOptions,
      allLabel: adGroupReferences.isPending ? 'Загрузка…' : 'Все',
    },
  ]
  const geographyFilters = [
    {
      key: 'country',
      label: 'Страна',
      options: countryOptions,
      allLabel: geographyReferences.isPending ? 'Загрузка…' : 'Все',
      clearOnChange: ['region', 'city', 'geo_id'],
    },
    {
      key: 'region',
      label: 'Регион',
      options: uniqueOptions(regionRows.map((row) => row.region)),
      allLabel: geographyReferences.isPending ? 'Загрузка…' : 'Все',
      clearOnChange: ['city', 'geo_id'],
    },
    {
      key: 'city',
      label: 'Город',
      options: uniqueOptions(cityRows.map((row) => row.city)),
      allLabel: geographyReferences.isPending ? 'Загрузка…' : 'Все',
      clearOnChange: ['geo_id'],
    },
  ]

  const content = () => {
    if (accountsQuery.isPending) return <Skeleton active paragraph={{ rows: 8 }} />
    if (accountsQuery.isError)
      return (
        <div className={styles.state}>
          <ApiErrorState error={accountsQuery.error} />
          <Button onClick={() => void accountsQuery.refetch()}>Повторить</Button>
        </div>
      )
    if (!accounts.length) return <Empty description="Google Ads аккаунты ещё не добавлены" />
    if (!selectedAccountIds.length) return <Empty description="Выберите Google Ads аккаунты" />
    return (
      <DataTable
        query={tableQuery}
        columns={visibleColumns}
        filters={filters}
        rowKey={dimensionRowKey}
        emptyText="По выбранным аккаунтам, периоду и фильтрам данных нет"
      />
    )
  }

  return (
    <div className={pageStyles.page}>
      <header className={entityStyles.header}>
        <h1 className={pageStyles.title}>{config.title}</h1>
        <p className={entityStyles.subtitle}>{config.subtitle}</p>
      </header>

      {kind === 'devices' && accounts.length > 0 && selectedAccountIds.length > 0 ? (
        <DeviceCards
          rows={deviceSummaryQuery.isError ? [] : (deviceSummaryQuery.data?.data ?? [])}
          loading={deviceSummaryQuery.isPending}
        />
      ) : null}

      <Card className={entityStyles.card} variant="outlined">
        <div className={entityStyles.toolbar}>
          <FilterBar
            filters={filters}
            leading={
              <GoogleAdsAccountPicker
                accounts={accounts}
                selectedIds={selectedAccountIds}
                allSelected={allAccountsSelected}
                loading={accountsQuery.isPending}
                onChange={(ids) =>
                  filters.setFilters({
                    ads_account_id: null,
                    ads_account_ids: accountIdsToUrl(ids, availableAccountIds),
                    campaign_id: null,
                    ad_group_id: null,
                  })
                }
                onSelectAll={() =>
                  filters.setFilters({
                    ads_account_id: null,
                    ads_account_ids: null,
                    campaign_id: null,
                    ad_group_id: null,
                  })
                }
              />
            }
            base={
              kind === 'geography'
                ? [...hierarchyFilters, ...geographyFilters]
                : [
                    ...hierarchyFilters,
                    {
                      key: 'device',
                      label: 'Устройство',
                      options: dictionaryOptions(devices),
                    },
                  ]
            }
            more={
              kind === 'geography'
                ? [
                    {
                      key: 'geo_id',
                      label: 'Geo ID',
                      options: uniqueOptions(geoIdRows.map((row) => row.geo_id)),
                    },
                  ]
                : []
            }
            actions={
              <>
                <Button icon={<Settings2 size={15} />} onClick={() => setSettingsOpen(true)}>
                  Колонки
                </Button>
                <ExportButton
                  filters={filters}
                  groupBy={config.groupBy}
                  columns={preferences.visibleKeys}
                  disabled={selectedAccountIds.length === 0}
                />
              </>
            }
          />
        </div>
        <div className={styles.tableHeading}>
          <div>
            <h2>{config.heading}</h2>
            <p>{config.subtitle}</p>
          </div>
        </div>
        {kind === 'geography' ? (
          <Alert
            className={styles.geoNote}
            type="info"
            showIcon
            title="География строится по данным Google Ads"
            description="Недоступные Google поля region, city и geo ID отображаются прочерком и не восстанавливаются системой. Фактические адреса заказов здесь не используются."
          />
        ) : null}
        {content()}
      </Card>

      <ColumnSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        labels={columnLabels}
        preferences={preferences.preferences}
        setPreferences={preferences.setPreferences}
      />
    </div>
  )
}

export function GeographyPage() {
  return <GoogleAdsDimensionsPage kind="geography" />
}

export function DevicesPage() {
  return <GoogleAdsDimensionsPage kind="devices" />
}
