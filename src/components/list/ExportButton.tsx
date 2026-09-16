import { App, Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { Download, FileSpreadsheet } from 'lucide-react'
import { useAnalyticsExportMutation } from '../../api/mutations'
import type { BreakdownGroup, ExportFormat } from '../../api/types'
import { exportRequestFromUrl } from '../../lib/googleAdsUrlState'
import type { UrlFiltersApi } from '../../lib/useUrlFilters'

export function ExportButton({
  filters,
  groupBy,
  columns,
  disabled = false,
}: {
  filters: UrlFiltersApi
  groupBy: BreakdownGroup
  columns: readonly string[]
  disabled?: boolean
}) {
  const { message } = App.useApp()
  const mutation = useAnalyticsExportMutation()

  const download = async (format: ExportFormat) => {
    try {
      const file = await mutation.mutateAsync(
        exportRequestFromUrl(filters, groupBy, columns, format),
      )
      const url = URL.createObjectURL(file.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.fileName ?? `google-ads-${groupBy}.${format}`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      message.success(`Экспорт ${format.toUpperCase()} скачан`)
    } catch {
      message.error('Не удалось подготовить экспорт')
    }
  }

  const items: MenuProps['items'] = [
    { key: 'csv', label: 'CSV', icon: <Download size={14} /> },
    { key: 'xlsx', label: 'XLSX', icon: <FileSpreadsheet size={14} /> },
  ]

  return (
    <Dropdown
      trigger={['click']}
      menu={{ items, onClick: ({ key }) => void download(key as ExportFormat) }}
    >
      <Button disabled={disabled} loading={mutation.isPending} icon={<Download size={15} />}>
        Экспорт
      </Button>
    </Dropdown>
  )
}
