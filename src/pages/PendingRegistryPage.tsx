import { Card, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import {
  listPending,
  listPendingByIssue,
  type ListedPendingEntry,
  type PendingVariant,
} from '../lib/pendingRegistry'
import styles from './Page.module.css'

const JIRA_BROWSE_URL = 'https://google-analytics.atlassian.net/browse/'

const variantLabels: Record<PendingVariant, string> = {
  cell: 'Ячейка',
  column: 'Колонка',
  filter: 'Фильтр',
  action: 'Действие',
  block: 'Блок',
  tab: 'Вкладка',
  screen: 'Экран',
}

const columns: TableColumnsType<ListedPendingEntry> = [
  {
    title: 'Задача',
    dataIndex: 'issue',
    width: 110,
    render: (issue: string) => (
      <Typography.Link href={`${JIRA_BROWSE_URL}${issue}`} target="_blank" rel="noreferrer">
        {issue}
      </Typography.Link>
    ),
  },
  { title: 'Экран', dataIndex: 'screen', width: 240 },
  { title: 'Элемент', dataIndex: 'element' },
  {
    title: 'Вариант',
    dataIndex: 'variant',
    width: 120,
    render: (variant: PendingVariant) => <Tag>{variantLabels[variant]}</Tag>,
  },
  { title: 'Ключ', dataIndex: 'id', width: 240 },
  { title: 'Примечание', dataIndex: 'note' },
]

/**
 * Список активных заглушек — чтобы на приёмке одним взглядом видеть, что ещё не закрыто (GA-28).
 * Маршрут `/debug/pending`, в боковое меню не выносится.
 */
export function PendingRegistryPage() {
  const entries = listPending()
  const groups = listPendingByIssue()

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Реестр заглушек</h1>
      <Card>
        <Typography.Paragraph type="secondary">
          {entries.length} активных заглушек по {groups.length} backend-задачам. Источник правды —{' '}
          <code>src/lib/pendingRegistry.ts</code>; почему элемент ждёт — в{' '}
          <code>docs/api-integration-delta.md</code>.
        </Typography.Paragraph>
        <Table<ListedPendingEntry>
          columns={columns}
          dataSource={entries}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  )
}
