/**
 * Пресеты периода из прототипа. Пресет разворачивается в пару ISO-дат без времени —
 * в этом виде период уходит в API.
 */

export type PeriodPreset =
  'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'previous_month' | 'custom'

export interface PeriodRange {
  date_from: string
  date_to: string
}

export const periodLabels: Record<PeriodPreset, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  last7: '7 дней',
  last30: '30 дней',
  this_month: 'Этот месяц',
  previous_month: 'Прошлый месяц',
  custom: 'Произвольный',
}

export const DEFAULT_PERIOD: PeriodPreset = 'last30'

export function periodOptions(): { value: PeriodPreset; label: string }[] {
  return (Object.keys(periodLabels) as PeriodPreset[]).map((value) => ({
    value,
    label: periodLabels[value],
  }))
}

function shiftDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function isoDay(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Пара границ периода. `custom` разворачивать нечем — диапазон задаёт пользователь,
 * поэтому возвращается `null`.
 */
export function resolvePeriod(preset: PeriodPreset, now = new Date()): PeriodRange | null {
  switch (preset) {
    case 'today':
      return { date_from: isoDay(now), date_to: isoDay(now) }
    case 'yesterday': {
      const yesterday = shiftDays(now, -1)
      return {
        date_from: isoDay(yesterday),
        date_to: isoDay(yesterday),
      }
    }
    case 'last7':
      return {
        date_from: isoDay(shiftDays(now, -6)),
        date_to: isoDay(now),
      }
    case 'last30':
      return {
        date_from: isoDay(shiftDays(now, -29)),
        date_to: isoDay(now),
      }
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { date_from: isoDay(first), date_to: isoDay(now) }
    }
    case 'previous_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      return { date_from: isoDay(first), date_to: isoDay(last) }
    }
    case 'custom':
      return null
  }
}

export function isPeriodPreset(value: string | null | undefined): value is PeriodPreset {
  return !!value && value in periodLabels
}

/** Границы периода в именах query-параметров фактического API. */
export interface PeriodQueryParams {
  from: string
  to: string
}

/**
 * То же, что `resolvePeriod`, но в именах, которые понимает бэкенд.
 *
 * Согласованный контракт зовёт границы периода `date_from` и `date_to` (`ReportFilter` в
 * `docs/openapi.yaml`), фактическая реализация — `from` и `to`
 * (`docs/openapi-backend.yaml`, параметры `From` и `To`). Неизвестные параметры сервер молча
 * игнорирует, поэтому без перевода фильтр периода выглядит рабочим и не фильтрует ничего.
 *
 * Перевод живёт здесь — на границе «состояние экрана → запрос», а не в `resolvePeriod`:
 * сам период остаётся в именах контракта, как и `ReportFilter`.
 */
export function periodQueryParams(
  preset: PeriodPreset,
  now = new Date(),
): PeriodQueryParams | null {
  const range = resolvePeriod(preset, now)
  return range && { from: range.date_from, to: range.date_to }
}
