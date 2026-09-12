/**
 * Пресеты периода из прототипа: «Сегодня», «Вчера», «7 дней», «30 дней», «Этот месяц»,
 * «Произвольный». Пресет разворачивается в пару ISO-дат — в этом виде период уходит в API.
 */

export type PeriodPreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'custom'

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
  custom: 'Произвольный',
}

export const DEFAULT_PERIOD: PeriodPreset = 'last30'

export function periodOptions(): { value: PeriodPreset; label: string }[] {
  return (Object.keys(periodLabels) as PeriodPreset[]).map((value) => ({
    value,
    label: periodLabels[value],
  }))
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function shiftDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

/**
 * Пара границ периода. `custom` разворачивать нечем — диапазон задаёт пользователь,
 * поэтому возвращается `null`.
 */
export function resolvePeriod(preset: PeriodPreset, now = new Date()): PeriodRange | null {
  switch (preset) {
    case 'today':
      return { date_from: startOfDay(now).toISOString(), date_to: endOfDay(now).toISOString() }
    case 'yesterday': {
      const yesterday = shiftDays(now, -1)
      return {
        date_from: startOfDay(yesterday).toISOString(),
        date_to: endOfDay(yesterday).toISOString(),
      }
    }
    case 'last7':
      return {
        date_from: startOfDay(shiftDays(now, -6)).toISOString(),
        date_to: endOfDay(now).toISOString(),
      }
    case 'last30':
      return {
        date_from: startOfDay(shiftDays(now, -29)).toISOString(),
        date_to: endOfDay(now).toISOString(),
      }
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { date_from: startOfDay(first).toISOString(), date_to: endOfDay(now).toISOString() }
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
