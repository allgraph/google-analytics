import { describe, expect, it } from 'vitest'
import { isPeriodPreset, periodLabels, resolvePeriod } from './period'

/** Полдень 3 сентября 2026 в локальной таймзоне — границы суток считаются от неё. */
const NOW = new Date(2026, 8, 3, 12, 0, 0)

function day(range: { date_from: string; date_to: string }) {
  return {
    from: new Date(range.date_from).toDateString(),
    to: new Date(range.date_to).toDateString(),
  }
}

describe('resolvePeriod', () => {
  it('шесть пресетов, как в прототипе', () => {
    expect(Object.keys(periodLabels)).toHaveLength(6)
  })

  it('«Сегодня» — одни сутки', () => {
    expect(day(resolvePeriod('today', NOW)!)).toEqual({
      from: NOW.toDateString(),
      to: NOW.toDateString(),
    })
  })

  it('«Вчера» — предыдущие сутки целиком', () => {
    const range = resolvePeriod('yesterday', NOW)!
    expect(day(range)).toEqual({
      from: new Date(2026, 8, 2).toDateString(),
      to: new Date(2026, 8, 2).toDateString(),
    })
  })

  it('«7 дней» включает сегодняшний день', () => {
    const range = resolvePeriod('last7', NOW)!
    expect(day(range).from).toBe(new Date(2026, 7, 28).toDateString())
    expect(day(range).to).toBe(NOW.toDateString())
  })

  it('«30 дней» отсчитывает 29 дней назад', () => {
    expect(day(resolvePeriod('last30', NOW)!).from).toBe(new Date(2026, 7, 5).toDateString())
  })

  it('«Этот месяц» начинается с первого числа', () => {
    expect(day(resolvePeriod('this_month', NOW)!).from).toBe(new Date(2026, 8, 1).toDateString())
  })

  it('«Произвольный» разворачивать нечем — диапазон задаёт пользователь', () => {
    expect(resolvePeriod('custom', NOW)).toBeNull()
  })
})

describe('isPeriodPreset', () => {
  it('отличает пресет от мусора в URL', () => {
    expect(isPeriodPreset('last30')).toBe(true)
    expect(isPeriodPreset('вчера')).toBe(false)
    expect(isPeriodPreset(null)).toBe(false)
  })
})
