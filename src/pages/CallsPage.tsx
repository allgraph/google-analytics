import { Button } from 'antd'
import type { TableColumnsType } from 'antd'
import { Play, Settings2 } from 'lucide-react'
import { useMemo, useState, type Key } from 'react'
import { useApiListQuery } from '../api/hooks'
import { apiRoutes } from '../api/routes'
import type { Call } from '../api/types'
import { StatusTag } from '../components/StatusTag'
import { RestrictedValue } from '../components/RestrictedValue'
import {
  ButtonCell,
  ColumnSettings,
  DataTable,
  FilterBar,
  IconCell,
  LinkCell,
  MonoCell,
  TwoLineCell,
  ValueCell,
  type BulkAction,
  type FilterDefinition,
} from '../components/list'
import { PendingData, pendingColumn } from '../components/pending'
import { useColumnPreferences } from '../lib/columnPreferences'
import { callStatuses, confidenceCategories, dictionaryOptions } from '../lib/dictionaries'
import { formatDateTime, formatDurationSeconds } from '../lib/format'
import { useUrlFilters } from '../lib/useUrlFilters'
import { isFieldHidden } from '../auth/accessPolicy'
import { useAppStore } from '../store/useAppStore'
import styles from './CallsPage.module.css'
import pageStyles from './Page.module.css'

/**
 * Экран «Звонки» (GA-27) — витрина примитивов списка. Состав колонок, фильтров и действий взят
 * из прототипа; всё, чего бэкенд не отдаёт, остаётся на месте, но помечено заглушкой.
 */

const SCREEN = 'calls'

/** Подписи колонок из `colModalCols` прототипа. */
const columnLabels: Record<string, string> = {
  started_at: 'Время',
  call_id: 'call_id',
  caller_phone: 'Номер звонящего',
  site: 'Сайт',
  wait: 'Ожидание',
  talk: 'Разговор',
  status: 'Статус',
  operator: 'Оператор',
  confidence: 'Уверенность',
  source: 'Источник',
  is_repeat: 'Повторный',
  lead: 'Заявка',
  recording: 'Запись',
}

const COLUMN_ORDER = Object.keys(columnLabels)

/** Массовые действия звонков из прототипа. Бэкендом не обеспечены — GA-37. */
const bulkActions: BulkAction[] = [
  { key: 'create-leads', label: 'Создать заявки' },
  { key: 'assign-operator', label: 'Назначить оператора' },
  { key: 'mark-spam', label: 'Отметить как спам' },
]

export function CallsPage() {
  const filters = useUrlFilters()
  const role = useAppStore((state) => state.currentUser?.role)
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([])
  const [columnsOpen, setColumnsOpen] = useState(false)
  const { preferences, setPreferences, visibleKeys } = useColumnPreferences(SCREEN, COLUMN_ORDER)

  const query = useApiListQuery<Call>({
    entity: SCREEN,
    path: apiRoutes.calls,
    params: filters.toQueryParams(),
  })

  const columns = useMemo(() => buildColumns(visibleKeys), [visibleKeys])
  const visibleBaseFilters = baseFilters.filter(
    ({ key }) => !(key === 'operator_id' && isFieldHidden(role, 'staff')),
  )
  const visibleMoreFilters = moreFilters.filter(({ key }) => {
    if (isFieldHidden(role, 'advertising')) {
      if (['campaign_id', 'ad_group_id', 'keyword_id', 'ad_id'].includes(key)) return false
    }
    if (isFieldHidden(role, 'staff')) {
      if (key === 'operator_id_more' || key === 'master_id') return false
    }
    return true
  })

  return (
    <div className={`${pageStyles.page} ${styles.calls}`}>
      <h1 className={pageStyles.title}>Звонки</h1>

      <FilterBar
        filters={filters}
        base={visibleBaseFilters}
        more={visibleMoreFilters}
        search={{ placeholder: 'Поиск по номеру', pending: 'calls.phone-search' }}
        actions={
          <>
            <Button icon={<Settings2 size={15} />} onClick={() => setColumnsOpen(true)}>
              Настроить колонки
            </Button>
            <PendingData id="calls.export" variant="action">
              <Button disabled>Экспорт звонков</Button>
            </PendingData>
          </>
        }
      />

      <DataTable<Call>
        columns={columns}
        query={query}
        filters={filters}
        rowKey="id"
        bulkActions={bulkActions}
        bulkActionsPending="calls.bulk-actions"
        selectedKeys={selectedKeys}
        onSelectedKeysChange={setSelectedKeys}
        emptyText="Звонков по заданным условиям нет"
      />

      <ColumnSettings
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        preferences={preferences}
        setPreferences={setPreferences}
        labels={columnLabels}
      />
    </div>
  )
}

/** Базовые фильтры из `callFilters` прототипа. Бэкенд принимает только сайт и статус. */
const baseFilters: FilterDefinition[] = [
  { key: 'site_id', label: 'Сайт', options: [] },
  { key: 'status', label: 'Статус', options: dictionaryOptions(callStatuses) },
  { key: 'operator_id', label: 'Оператор', options: [], pending: 'calls.filters-extra' },
  {
    key: 'confidence',
    label: 'Уверенность',
    options: dictionaryOptions(confidenceCategories),
    pending: 'calls.filters-extra',
  },
  {
    key: 'is_repeat',
    label: 'Повторный',
    options: [
      { value: 'true', label: 'Да' },
      { value: 'false', label: 'Нет' },
    ],
    pending: 'calls.filters-extra',
  },
]

/** «Ещё фильтры (12)» из `dashMore` прототипа — ни один бэкендом не обеспечен (GA-36). */
const moreFilters: FilterDefinition[] = [
  { key: 'campaign_id', label: 'Кампания' },
  { key: 'ad_group_id', label: 'Группа' },
  { key: 'keyword_id', label: 'Ключ' },
  { key: 'search_query_id', label: 'Поисковый запрос' },
  { key: 'ad_id', label: 'Объявление' },
  { key: 'device', label: 'Устройство' },
  { key: 'country', label: 'Страна' },
  { key: 'district_id', label: 'Район' },
  { key: 'operator_id_more', label: 'Оператор' },
  { key: 'master_id', label: 'Мастер' },
  { key: 'status_more', label: 'Статус' },
  { key: 'confidence_more', label: 'Уверенность' },
].map((filter) => ({ ...filter, options: [], pending: 'calls.filters-extra' as const }))

function buildColumns(visibleKeys: string[]): TableColumnsType<Call> {
  const byKey: Record<string, TableColumnsType<Call>[number]> = {
    started_at: {
      key: 'started_at',
      title: columnLabels.started_at,
      dataIndex: 'started_at',
      sorter: true,
      render: (value: string) => formatDateTime(value, { style: 'short' }),
    },
    call_id: {
      key: 'call_id',
      title: columnLabels.call_id,
      dataIndex: 'call_id',
      render: (value: string) => <MonoCell value={value} />,
    },
    caller_phone: {
      key: 'caller_phone',
      title: columnLabels.caller_phone,
      dataIndex: 'caller_phone',
      render: (value: string) => <MonoCell value={value} />,
    },
    site: {
      key: 'site',
      title: columnLabels.site,
      dataIndex: ['site', 'label'],
      render: (value: string) => <ValueCell value={value} />,
    },
    wait: {
      key: 'wait',
      title: columnLabels.wait,
      dataIndex: 'wait_duration_seconds',
      align: 'right',
      render: (value: number | null) => <MonoCell value={formatDurationSeconds(value)} />,
    },
    talk: {
      key: 'talk',
      title: columnLabels.talk,
      dataIndex: 'talk_duration_seconds',
      align: 'right',
      sorter: true,
      render: (value: number | null) => <MonoCell value={formatDurationSeconds(value)} />,
    },
    status: {
      key: 'status',
      title: columnLabels.status,
      dataIndex: 'status',
      render: (value: string) => <StatusTag dictionary={callStatuses} code={value} />,
    },
    operator: {
      key: 'operator',
      title: columnLabels.operator,
      dataIndex: ['operator', 'label'],
      render: (value: string | null) => (
        <RestrictedValue field="staff">
          <ValueCell value={value} />
        </RestrictedValue>
      ),
    },
    confidence: {
      key: 'confidence',
      title: columnLabels.confidence,
      dataIndex: 'confidence',
      render: (value: string) => <StatusTag dictionary={confidenceCategories} code={value} />,
    },
    source: {
      key: 'source',
      title: columnLabels.source,
      render: (_value, call) => (
        <RestrictedValue field="advertising">
          <TwoLineCell value={call.campaign} sub={call.keyword} />
        </RestrictedValue>
      ),
    },
    is_repeat: {
      key: 'is_repeat',
      title: columnLabels.is_repeat,
      dataIndex: 'is_repeat',
      render: (value: boolean) => <ValueCell value={value ? 'Повторный' : null} />,
    },
    lead: {
      key: 'lead',
      title: columnLabels.lead,
      render: (_value, call) =>
        call.lead_id ? (
          <LinkCell to={`/requests/${call.lead_id}`} label={`#${call.lead_id}`} />
        ) : (
          <ButtonCell label="Создать" />
        ),
    },
    // Доступа к записи разговора бэкенд не даёт — колонка на месте, но неактивна (GA-38).
    recording: pendingColumn<Call>('calls.recording-column', {
      key: 'recording',
      title: columnLabels.recording,
      render: () => <IconCell icon={<Play size={15} />} label="Воспроизвести" />,
    }),
  }

  return visibleKeys.map((key) => byKey[key]).filter(Boolean)
}
