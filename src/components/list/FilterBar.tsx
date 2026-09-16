import { Button, Dropdown, Input, Popover, Tag } from 'antd'
import type { MenuProps } from 'antd'
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { PendingId } from '../../lib/pendingRegistry'
import { periodLabels, periodOptions } from '../../lib/period'
import type { UrlFiltersApi } from '../../lib/useUrlFilters'
import { PendingData } from '../pending'
import styles from './FilterBar.module.css'

export interface FilterDefinition {
  key: string
  label: string
  options?: { value: string; label: string }[]
  /** Произвольное строковое значение вместо списка вариантов. */
  text?: boolean
  /** Подпись значения «все» — у периода это «30 дней». */
  allLabel?: string
  /** Фильтры, которые нужно сбросить при смене этого значения. */
  clearOnChange?: string[]
  /** Фильтр показан, но бэкендом не обеспечен: ключ заглушки из реестра. */
  pending?: PendingId
}

interface FilterBarProps {
  filters: UrlFiltersApi
  /** Пользовательский контрол перед стандартными фильтрами, например multi-account picker. */
  leading?: ReactNode
  /** Фильтры в строке. */
  base: FilterDefinition[]
  /** Фильтры за кнопкой «Ещё фильтры (N)». */
  more?: FilterDefinition[]
  /** Поиск; если задан `pending`, строка рисуется неактивной. */
  search?: { placeholder: string; filterKey?: string; pending?: PendingId }
  /** Кнопки справа: «Настроить колонки», «Экспорт». */
  actions?: ReactNode
}

/**
 * Панель фильтров (GA-27): базовые фильтры в строке, остальные — в «Ещё фильтры», чипсы
 * выбранных значений и сброс. Состав и подписи — из прототипа.
 */
export function FilterBar({ filters, leading, base, more = [], search, actions }: FilterBarProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const chips = collectChips(filters, [...base, ...more])

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <PeriodFilter filters={filters} />
        {leading}
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
              value={filters.filters[search.filterKey ?? 'q'] ?? ''}
              onChange={(event) =>
                filters.setFilter(search.filterKey ?? 'q', event.target.value || null)
              }
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
            <Tag
              key={chip.key}
              closable
              onClose={() =>
                filters.setFilters({
                  ...Object.fromEntries(chip.clearOnChange.map((item) => [item, null])),
                  [chip.key]: null,
                })
              }
            >
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

function PeriodFilter({ filters }: { filters: UrlFiltersApi }) {
  const [open, setOpen] = useState(false)
  const period = filters.period
  const content = (
    <div className={styles.periodMenu} role="menu" aria-label="Период">
      {periodOptions().map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === period ? styles.periodOptionSelected : undefined}
          onClick={() => {
            filters.setPeriod(option.value)
            if (option.value !== 'custom') setOpen(false)
          }}
        >
          <span>{option.label}</span>
          {option.value === period ? <span>✓</span> : null}
        </button>
      ))}
      {period === 'custom' ? (
        <div className={styles.customRange}>
          <Input
            aria-label="Дата с"
            type="date"
            max={filters.filters.to || undefined}
            value={filters.filters.from ?? ''}
            onChange={(event) => filters.setFilter('from', event.target.value || null)}
          />
          <Input
            aria-label="Дата по"
            type="date"
            min={filters.filters.from || undefined}
            value={filters.filters.to ?? ''}
            onChange={(event) => filters.setFilter('to', event.target.value || null)}
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <Popover
      content={content}
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      trigger={['click']}
    >
      <Button icon={<ChevronDown size={14} />} iconPlacement="end">
        Период: {periodLabels[period]}
      </Button>
    </Popover>
  )
}

function FilterButton({ filter, filters }: { filter: FilterDefinition; filters: UrlFiltersApi }) {
  const current = filters.filters[filter.key]
  if (filter.text) {
    return (
      <Input
        allowClear
        className={styles.textFilter}
        aria-label={filter.label}
        placeholder={filter.label}
        value={current ?? ''}
        onChange={(event) => filters.setFilter(filter.key, event.target.value || null)}
      />
    )
  }
  const currentLabel =
    filter.options?.find((option) => option.value === current)?.label ?? filter.allLabel ?? 'Все'

  const items: MenuProps['items'] = [
    { key: '', label: filter.allLabel ?? 'Все' },
    ...(filter.options ?? []).map((option) => ({ key: option.value, label: option.label })),
  ]

  const button = (
    <Button icon={<ChevronDown size={14} />} iconPlacement="end" disabled={!!filter.pending}>
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
        onClick: ({ key }) =>
          filters.setFilters({
            ...Object.fromEntries((filter.clearOnChange ?? []).map((item) => [item, null])),
            [filter.key]: key || null,
          }),
      }}
    >
      {button}
    </Dropdown>
  )
}

function collectChips(
  filters: UrlFiltersApi,
  definitions: FilterDefinition[],
): { key: string; label: string; clearOnChange: string[] }[] {
  return definitions
    .filter((definition) => filters.filters[definition.key])
    .map((definition) => {
      const value = filters.filters[definition.key]
      const label = definition.options?.find((option) => option.value === value)?.label ?? value
      return {
        key: definition.key,
        label: `${definition.label}: ${label}`,
        clearOnChange: definition.clearOnChange ?? [],
      }
    })
}
