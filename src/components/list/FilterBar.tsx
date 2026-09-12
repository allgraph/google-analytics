import { Button, Dropdown, Input, Tag } from 'antd'
import type { MenuProps } from 'antd'
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { PendingId } from '../../lib/pendingRegistry'
import { periodLabels, periodOptions, type PeriodPreset } from '../../lib/period'
import type { UrlFiltersApi } from '../../lib/useUrlFilters'
import { PendingData } from '../pending'
import styles from './FilterBar.module.css'

export interface FilterDefinition {
  key: string
  label: string
  options: { value: string; label: string }[]
  /** Подпись значения «все» — у периода это «30 дней». */
  allLabel?: string
  /** Фильтр показан, но бэкендом не обеспечен: ключ заглушки из реестра. */
  pending?: PendingId
}

interface FilterBarProps {
  filters: UrlFiltersApi
  /** Фильтры в строке. */
  base: FilterDefinition[]
  /** Фильтры за кнопкой «Ещё фильтры (N)». */
  more?: FilterDefinition[]
  /** Поиск; если задан `pending`, строка рисуется неактивной. */
  search?: { placeholder: string; pending?: PendingId }
  /** Кнопки справа: «Настроить колонки», «Экспорт». */
  actions?: ReactNode
}

/**
 * Панель фильтров (GA-27): базовые фильтры в строке, остальные — в «Ещё фильтры», чипсы
 * выбранных значений и сброс. Состав и подписи — из прототипа.
 */
export function FilterBar({ filters, base, more = [], search, actions }: FilterBarProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const chips = collectChips(filters, [...base, ...more])

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <PeriodFilter period={filters.period} onChange={filters.setPeriod} />
        {base.map((filter) => (
          <FilterButton key={filter.key} filter={filter} filters={filters} />
        ))}

        {more.length > 0 ? (
          <Button
            icon={<SlidersHorizontal size={15} />}
            onClick={() => setMoreOpen((open) => !open)}
          >
            Ещё фильтры ({more.length})
          </Button>
        ) : null}

        <span className={styles.spacer} />

        {search ? (
          search.pending ? (
            <PendingData id={search.pending} variant="filter">
              <Input
                disabled
                prefix={<Search size={14} />}
                placeholder={search.placeholder}
                className={styles.search}
              />
            </PendingData>
          ) : (
            <Input
              allowClear
              prefix={<Search size={14} />}
              placeholder={search.placeholder}
              className={styles.search}
              value={filters.filters.q ?? ''}
              onChange={(event) => filters.setFilter('q', event.target.value || null)}
            />
          )
        ) : null}

        {actions}
      </div>

      {moreOpen && more.length > 0 ? (
        <div className={styles.row}>
          {more.map((filter) => (
            <FilterButton key={filter.key} filter={filter} filters={filters} />
          ))}
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className={styles.chips}>
          {chips.map((chip) => (
            <Tag key={chip.key} closable onClose={() => filters.setFilter(chip.key, null)}>
              {chip.label}
            </Tag>
          ))}
          <Button size="small" type="link" onClick={filters.reset}>
            Сбросить
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function PeriodFilter({
  period,
  onChange,
}: {
  period: PeriodPreset
  onChange: (preset: PeriodPreset) => void
}) {
  const items: MenuProps['items'] = periodOptions().map((option) => ({
    key: option.value,
    label: option.label,
  }))

  return (
    <Dropdown
      trigger={['click']}
      menu={{ items, selectedKeys: [period], onClick: ({ key }) => onChange(key as PeriodPreset) }}
    >
      <Button icon={<ChevronDown size={14} />} iconPosition="end">
        Период: {periodLabels[period]}
      </Button>
    </Dropdown>
  )
}

function FilterButton({ filter, filters }: { filter: FilterDefinition; filters: UrlFiltersApi }) {
  const current = filters.filters[filter.key]
  const currentLabel =
    filter.options.find((option) => option.value === current)?.label ?? filter.allLabel ?? 'Все'

  const items: MenuProps['items'] = [
    { key: '', label: filter.allLabel ?? 'Все' },
    ...filter.options.map((option) => ({ key: option.value, label: option.label })),
  ]

  const button = (
    <Button icon={<ChevronDown size={14} />} iconPosition="end" disabled={!!filter.pending}>
      {filter.label}: {currentLabel}
    </Button>
  )

  if (filter.pending) {
    return (
      <PendingData id={filter.pending} variant="filter">
        {button}
      </PendingData>
    )
  }

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectedKeys: current ? [current] : [''],
        onClick: ({ key }) => filters.setFilter(filter.key, key || null),
      }}
    >
      {button}
    </Dropdown>
  )
}

function collectChips(
  filters: UrlFiltersApi,
  definitions: FilterDefinition[],
): { key: string; label: string }[] {
  return definitions
    .filter((definition) => filters.filters[definition.key])
    .map((definition) => {
      const value = filters.filters[definition.key]
      const label = definition.options.find((option) => option.value === value)?.label ?? value
      return { key: definition.key, label: `${definition.label}: ${label}` }
    })
}
