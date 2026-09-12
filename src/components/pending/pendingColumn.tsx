import type { ColumnType } from 'antd/es/table'
import { getPendingEntry, pendingTooltip, type PendingId } from '../../lib/pendingRegistry'
import { PendingCell, PendingData } from './PendingData'

/**
 * Колонка целиком в заглушке: пометка в заголовке, во всех ячейках прочерк.
 * Сортировка и фильтрация по такой колонке отключаются — данных под ними нет.
 */
export function pendingColumn<T>(id: PendingId, column: ColumnType<T>): ColumnType<T> {
  const entry = getPendingEntry(id)

  return {
    ...column,
    title: (
      <PendingData id={id} variant="column">
        {column.title as React.ReactNode}
      </PendingData>
    ),
    sorter: false,
    filters: undefined,
    render: () => <PendingCell id={id} />,
    onHeaderCell: () => ({ title: pendingTooltip(entry) }),
  }
}
