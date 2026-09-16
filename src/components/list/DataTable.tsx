import { Button, Empty, Select, Skeleton, Table } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import type { SorterResult } from 'antd/es/table/interface'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Key } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ListEnvelope } from '../../api/types'
import type { ApiError } from '../../services/api'
import { PAGE_SIZES, type UrlFiltersApi } from '../../lib/useUrlFilters'
import { ApiErrorState } from '../ApiErrorState'
import { PendingData } from '../pending'
import styles from './DataTable.module.css'

export interface BulkAction {
  key: string
  label: string
  onClick?: (selected: Key[]) => void
}

interface DataTableProps<T> {
  columns: TableColumnsType<T>
  query: UseQueryResult<ListEnvelope<T>, ApiError>
  filters: UrlFiltersApi
  rowKey: keyof T & string
  /** Панель «Выбрано N» появляется, только если действия заданы. */
  bulkActions?: BulkAction[]
  /** Ключ заглушки, если сами массовые действия бэкендом не обеспечены. */
  bulkActionsPending?: Parameters<typeof PendingData>[0]['id']
  selectedKeys?: Key[]
  onSelectedKeysChange?: (keys: Key[]) => void
  emptyText?: string
  /** Переход в следующий уровень иерархии по клику или Enter. */
  onRowClick?: (record: T) => void
}

/**
 * Таблица списка (GA-27): пагинация, сортировка, выделение строк и четыре состояния —
 * загрузка, пусто, ошибка, нет прав.
 */
export function DataTable<T extends object>({
  columns,
  query,
  filters,
  rowKey,
  bulkActions,
  bulkActionsPending,
  selectedKeys = [],
  onSelectedKeysChange,
  emptyText = 'По заданным условиям записей нет',
  onRowClick,
}: DataTableProps<T>) {
  if (query.isPending)
    return (
      <div className={styles.state}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )
  if (query.isError)
    return (
      <div className={styles.state}>
        <ApiErrorState error={query.error} />
      </div>
    )

  const rows = query.data?.data ?? []
  const meta = query.data?.meta

  const handleChange: TableProps<T>['onChange'] = (_pagination, _filters, sorter) => {
    const single = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<T>)
    if (!single?.order) {
      filters.setSort(null)
      return
    }
    filters.setSort(
      String(single.columnKey ?? single.field),
      single.order === 'ascend' ? 'asc' : 'desc',
    )
  }

  return (
    <div className={styles.wrapper}>
      {bulkActions && selectedKeys.length > 0 ? (
        <BulkBar
          count={selectedKeys.length}
          actions={bulkActions}
          pendingId={bulkActionsPending}
          selectedKeys={selectedKeys}
          onClear={() => onSelectedKeysChange?.([])}
        />
      ) : null}

      <Table<T>
        className={styles.table}
        columns={columns}
        dataSource={rows}
        rowKey={rowKey}
        size="middle"
        pagination={false}
        scroll={{ x: 'max-content' }}
        onChange={handleChange}
        // Первый клик по колонке даёт `order=desc` — так зафиксировано в docs/api-contract.md.
        sortDirections={['descend', 'ascend']}
        locale={{ emptyText: <Empty description={emptyText} /> }}
        onRow={
          onRowClick
            ? (record) => ({
                className: styles.clickableRow,
                role: 'link',
                tabIndex: 0,
                onClick: () => onRowClick(record),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') onRowClick(record)
                },
              })
            : undefined
        }
        rowSelection={
          bulkActions
            ? {
                selectedRowKeys: selectedKeys,
                onChange: (keys) => onSelectedKeysChange?.(keys),
              }
            : undefined
        }
      />

      <TableFooter
        filters={filters}
        from={meta?.from ?? 0}
        to={meta?.to ?? 0}
        hasNextPage={rows.length >= filters.perPage}
      />
    </div>
  )
}

function BulkBar({
  count,
  actions,
  pendingId,
  selectedKeys,
  onClear,
}: {
  count: number
  actions: BulkAction[]
  pendingId?: Parameters<typeof PendingData>[0]['id']
  selectedKeys: Key[]
  onClear: () => void
}) {
  const buttons = (
    <>
      {actions.map((action) => (
        <Button
          key={action.key}
          size="small"
          className={styles.bulkButton}
          onClick={() => action.onClick?.(selectedKeys)}
          disabled={!!pendingId}
        >
          {action.label}
        </Button>
      ))}
    </>
  )

  return (
    <div className={styles.bulkBar}>
      <span className={styles.bulkCount}>Выбрано {count}</span>
      <span className={styles.spacer} />
      {pendingId ? (
        <PendingData id={pendingId} variant="action">
          {buttons}
        </PendingData>
      ) : (
        buttons
      )}
      <Button size="small" type="text" className={styles.bulkClear} onClick={onClear}>
        Снять выделение
      </Button>
    </div>
  )
}

function TableFooter({
  filters,
  from,
  to,
  hasNextPage,
}: {
  filters: UrlFiltersApi
  from: number
  to: number
  hasNextPage: boolean
}) {
  return (
    <div className={styles.footer}>
      <div className={styles.footerGroup}>
        <span className={styles.footerLabel}>Строк на странице</span>
        <Select
          size="small"
          value={filters.perPage}
          className={styles.pageSize}
          onChange={filters.setPerPage}
          options={PAGE_SIZES.map((size) => ({ value: size, label: String(size) }))}
        />
      </div>

      <span className={styles.range}>
        {/* Общее число записей бэкенд не отдаёт (GA-31): пагинация работает в режиме
            «есть ли следующая страница». */}
        {to > 0 ? (
          <>
            Показано {from}–{to} из <PendingData id="lists.total" variant="cell" />
          </>
        ) : (
          'Записей нет'
        )}
      </span>

      <nav className={styles.pager} aria-label="Страницы">
        <button
          type="button"
          className={styles.pagerButton}
          aria-label="Предыдущая страница"
          disabled={filters.page <= 1}
          onClick={() => filters.setPage(filters.page - 1)}
        >
          <ChevronLeft size={15} aria-hidden />
        </button>
        <span className={styles.pagerCurrent} aria-current="page">
          {filters.page}
        </span>
        <button
          type="button"
          className={styles.pagerButton}
          aria-label="Следующая страница"
          disabled={!hasNextPage}
          onClick={() => filters.setPage(filters.page + 1)}
        >
          <ChevronRight size={15} aria-hidden />
        </button>
      </nav>
    </div>
  )
}
