import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { FormQueryParams } from '../api/adapters'
import { DEFAULT_PERIOD, isPeriodPreset, periodQueryParams, type PeriodPreset } from './period'

/**
 * Состояние списка живёт в URL (GA-27): ссылку на отфильтрованный список можно отправить
 * коллеге, и она откроется у него в том же виде. Страница, размер страницы, сортировка и
 * значения фильтров — всё в query-параметрах.
 */

export const PAGE_SIZES = [10, 50, 100, 500] as const
export const DEFAULT_PAGE_SIZE = 10

export type SortOrder = 'asc' | 'desc'

export interface ListQueryState {
  page: number
  perPage: number
  sort?: string
  /** Первый клик по сортируемой колонке даёт `desc` — так зафиксировано в `docs/api-contract.md`. */
  order?: SortOrder
  period: PeriodPreset
  /** Значения фильтров, кроме периода: ключ → выбранное значение. */
  filters: Record<string, string>
}

export interface UrlFiltersApi extends ListQueryState {
  setFilter: (key: string, value: string | null) => void
  setPeriod: (preset: PeriodPreset) => void
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
  setSort: (field: string | null, order?: SortOrder) => void
  reset: () => void
  /** Параметры для `useApiListQuery` — период уже развёрнут в пару дат. */
  toQueryParams: () => FormQueryParams & { page: number; per_page: number }
}

const RESERVED = new Set(['page', 'per_page', 'sort', 'order', 'period'])

function readNumber(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function useUrlFilters(): UrlFiltersApi {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo<ListQueryState>(() => {
    const filters: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      if (!RESERVED.has(key) && value) filters[key] = value
    })

    const order = searchParams.get('order')
    const period = searchParams.get('period')

    return {
      page: readNumber(searchParams.get('page'), 1),
      perPage: readNumber(searchParams.get('per_page'), DEFAULT_PAGE_SIZE),
      sort: searchParams.get('sort') ?? undefined,
      order: order === 'asc' || order === 'desc' ? order : undefined,
      period: isPeriodPreset(period) ? period : DEFAULT_PERIOD,
      filters,
    }
  }, [searchParams])

  const update = useCallback(
    (changes: Record<string, string | null>, resetPage = true) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          Object.entries(changes).forEach(([key, value]) => {
            if (value === null || value === '') next.delete(key)
            else next.set(key, value)
          })
          if (resetPage && !('page' in changes)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setFilter = useCallback(
    (key: string, value: string | null) => update({ [key]: value }),
    [update],
  )

  const setPeriod = useCallback((preset: PeriodPreset) => update({ period: preset }), [update])

  const setPage = useCallback(
    (page: number) => update({ page: page > 1 ? String(page) : null }, false),
    [update],
  )

  const setPerPage = useCallback(
    (perPage: number) => update({ per_page: String(perPage) }),
    [update],
  )

  const setSort = useCallback(
    (field: string | null, order: SortOrder = 'desc') =>
      update({ sort: field, order: field ? order : null }, false),
    [update],
  )

  const reset = useCallback(
    () => setSearchParams(new URLSearchParams(), { replace: true }),
    [setSearchParams],
  )

  const toQueryParams = useCallback(() => {
    // Границы периода уходят в API как `from` и `to` — см. `periodQueryParams`.
    const range = periodQueryParams(state.period)

    return {
      page: state.page,
      per_page: state.perPage,
      ...(state.sort ? { sort: state.sort, order: state.order ?? 'desc' } : {}),
      ...(range ?? {}),
      ...state.filters,
    }
  }, [state])

  return { ...state, setFilter, setPeriod, setPage, setPerPage, setSort, reset, toQueryParams }
}
