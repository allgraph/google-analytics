import { describe, expect, it } from 'vitest'
import {
  EMPTY_VALUE,
  formatDate,
  formatDateTime,
  formatDurationMs,
  formatDurationSeconds,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent,
  formatRatio,
  formatTime,
} from './format'

const BERLIN = 'Europe/Berlin'

/** Пробелы-разделители Intl различаются между средами — сравниваем по видимому содержанию. */
function plain(value: string): string {
  return value.replaceAll(/[  ]/g, ' ')
}

describe('formatMoney', () => {
  it('ставит символ валюты перед суммой и два знака после запятой', () => {
    expect(plain(formatMoney({ amount: '1234.56', currency: 'EUR' }))).toBe('€ 1 234,56')
  })

  it('показывает ноль как сумму, а не как прочерк', () => {
    expect(plain(formatMoney({ amount: '0.00', currency: 'EUR' }))).toBe('€ 0,00')
  })

  it('отрицательную сумму отбивает типографским минусом', () => {
    expect(plain(formatMoney({ amount: '-212.00', currency: 'EUR' }))).toBe('− € 212,00')
  })

  it('без дробной части для KPI-плиток', () => {
    expect(plain(formatMoneyCompact({ amount: '12480.00', currency: 'EUR' }))).toBe('€ 12 480')
  })

  it('отсутствие значения даёт прочерк', () => {
    expect(formatMoney(null)).toBe(EMPTY_VALUE)
    expect(formatMoney({ amount: 'нечисло', currency: 'EUR' })).toBe(EMPTY_VALUE)
  })
})

describe('formatNumber', () => {
  it('разделяет разряды', () => {
    expect(plain(formatNumber(1284))).toBe('1 284')
  })

  it('отсутствие значения даёт прочерк', () => {
    expect(formatNumber(null)).toBe(EMPTY_VALUE)
    expect(formatNumber(Number.NaN)).toBe(EMPTY_VALUE)
  })
})

describe('formatPercent', () => {
  it('показывает один знак после запятой', () => {
    expect(plain(formatPercent(175.5))).toBe('175,5%')
  })

  it('ноль — это ноль, а не прочерк', () => {
    expect(plain(formatPercent(0))).toBe('0,0%')
  })

  it('null от нулевого знаменателя даёт прочерк', () => {
    expect(formatPercent(null)).toBe(EMPTY_VALUE)
  })
})

describe('formatRatio', () => {
  it('считает долю', () => {
    expect(plain(formatRatio(12, 48))).toBe('25,0%')
  })

  it('нулевой знаменатель даёт прочерк, а не 0% и не NaN', () => {
    expect(formatRatio(5, 0)).toBe(EMPTY_VALUE)
    expect(formatRatio(0, 0)).toBe(EMPTY_VALUE)
    expect(formatRatio(5, null)).toBe(EMPTY_VALUE)
  })
})

describe('даты', () => {
  const iso = '2026-09-03T12:22:15Z'

  it('дата в заданной таймзоне', () => {
    expect(formatDate(iso, { timeZone: BERLIN })).toBe('03.09.2026')
  })

  it('время в заданной таймзоне', () => {
    expect(formatTime(iso, { timeZone: BERLIN })).toBe('14:22')
  })

  it('короткий формат без года', () => {
    expect(formatDateTime(iso, { style: 'short', timeZone: BERLIN })).toBe('03.09 14:22')
  })

  it('полный формат с годом и секундами', () => {
    expect(formatDateTime(iso, { style: 'full', timeZone: BERLIN })).toBe('03.09.2026 14:22:15')
  })

  it('пустое значение даёт прочерк', () => {
    expect(formatDateTime(null)).toBe(EMPTY_VALUE)
    expect(formatDateTime('не дата')).toBe(EMPTY_VALUE)
  })
})

describe('длительности', () => {
  it('нулевая длительность', () => {
    expect(formatDurationSeconds(0)).toBe('00:00')
  })

  it('минуты и секунды', () => {
    expect(formatDurationSeconds(65)).toBe('01:05')
  })

  it('от часа добавляет часы', () => {
    expect(formatDurationSeconds(3661)).toBe('1:01:01')
  })

  it('миллисекунды бэкенда переводятся в мм:сс', () => {
    expect(formatDurationMs(275_000)).toBe('04:35')
  })

  it('отсутствие значения даёт прочерк', () => {
    expect(formatDurationMs(null)).toBe(EMPTY_VALUE)
    expect(formatDurationSeconds(undefined)).toBe(EMPTY_VALUE)
  })
})
