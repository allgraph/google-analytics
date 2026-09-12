/**
 * Форматирование денег, чисел, дат и длительностей (GA-29).
 *
 * Единственное место, где сырые значения API превращаются в то, что видит пользователь.
 * Вид сверен с прототипом `project-materials/prototype/Callgraph - сквозная аналитика.html`:
 * `€ 12 480`, `− € 1 234,56`, `12,4%`, `04:35`.
 *
 * Экраны не форматируют деньги и даты самостоятельно — иначе «Финансы» и «Дашборд» разойдутся
 * в цифрах.
 */

import type { Money, NullableMetric } from '../api/types'
import { EMPTY_VALUE } from './emptyValue'

const LOCALE = 'ru-RU'
/** Знак минуса из прототипа — типографский, не дефис. */
const MINUS = '−'
const NARROW_NBSP = ' '
const NBSP = ' '

export { EMPTY_VALUE }

/**
 * Таймзона показа. Пока системная; когда появится профиль пользователя (A5), берётся оттуда —
 * и это единственное место, которое придётся поправить.
 */
export function getDisplayTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

const numberFormatters = new Map<string, Intl.NumberFormat>()
const dateFormatters = new Map<string, Intl.DateTimeFormat>()

function numberFormatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options)
  let formatter = numberFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, options)
    numberFormatters.set(key, formatter)
  }
  return formatter
}

function dateFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options)
  let formatter = dateFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALE, options)
    dateFormatters.set(key, formatter)
  }
  return formatter
}

/** Разряды разделяются обычным пробелом, как в прототипе, а не узким неразрывным. */
function normalizeSpaces(value: string): string {
  return value.replaceAll(NARROW_NBSP, NBSP)
}

function withSign(absolute: string, negative: boolean): string {
  return negative ? `${MINUS}${NBSP}${absolute}` : absolute
}

export interface NumberFormatOptions {
  /** Знаков после запятой; по умолчанию столько, сколько есть, но не больше двух. */
  digits?: number
}

export function formatNumber(
  value: number | null | undefined,
  { digits }: NumberFormatOptions = {},
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY_VALUE

  const formatted = numberFormatter({
    minimumFractionDigits: digits ?? 0,
    maximumFractionDigits: digits ?? 2,
  }).format(Math.abs(value))

  return withSign(normalizeSpaces(formatted), value < 0)
}

export interface MoneyFormatOptions {
  /** `false` — без копеек, для KPI-плиток. По умолчанию `true`. */
  fractional?: boolean
}

/**
 * Деньги. `Money.amount` — уже мажорные единицы: перевод из minor units делает
 * `fromMinorUnits` в `src/api/adapters.ts`, дублировать его здесь не нужно.
 */
export function formatMoney(
  money: Money | null | undefined,
  { fractional = true }: MoneyFormatOptions = {},
): string {
  if (!money) return EMPTY_VALUE

  const value = Number(money.amount)
  if (!Number.isFinite(value)) return EMPTY_VALUE

  const digits = fractional ? 2 : 0
  const parts = numberFormatter({
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(Math.abs(value))

  // В прототипе символ валюты стоит перед суммой и отделён пробелом: `€ 12 480`.
  const symbol = parts.find((part) => part.type === 'currency')?.value ?? money.currency
  const amount = parts
    .filter((part) => part.type !== 'currency' && part.type !== 'literal')
    .map((part) => part.value)
    .join('')

  return withSign(`${symbol}${NBSP}${normalizeSpaces(amount)}`, value < 0)
}

/** Деньги без копеек — вид KPI-плиток дашборда. */
export function formatMoneyCompact(money: Money | null | undefined): string {
  return formatMoney(money, { fractional: false })
}

/**
 * Проценты. Производные показатели с нулевым знаменателем приходят как `null`
 * (`docs/api-contract.md`) — показываем прочерк, не `0 %` и не `NaN`.
 */
export function formatPercent(value: NullableMetric | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY_VALUE

  const formatted = numberFormatter({
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value))

  return withSign(`${normalizeSpaces(formatted)}%`, value < 0)
}

/** Производный показатель, который считается на клиенте: нулевой знаменатель даёт прочерк. */
export function formatRatio(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  digits = 1,
): string {
  if (numerator === null || numerator === undefined) return EMPTY_VALUE
  if (!denominator) return EMPTY_VALUE
  return formatPercent((numerator / denominator) * 100, digits)
}

function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export interface DateFormatOptions {
  timeZone?: string
}

/** Короткая дата: `03.09.2026`. */
export function formatDate(
  iso: string | null | undefined,
  options: DateFormatOptions = {},
): string {
  const date = parseIso(iso)
  if (!date) return EMPTY_VALUE

  return dateFormatter({
    timeZone: options.timeZone ?? getDisplayTimeZone(),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/** Время: `14:22`. */
export function formatTime(
  iso: string | null | undefined,
  options: DateFormatOptions = {},
): string {
  const date = parseIso(iso)
  if (!date) return EMPTY_VALUE

  return dateFormatter({
    timeZone: options.timeZone ?? getDisplayTimeZone(),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export interface DateTimeFormatOptions extends DateFormatOptions {
  /** `short` — `03.09 14:22` для колонок; `full` — `03.09.2026 14:22:15` для карточек. */
  style?: 'short' | 'full'
}

export function formatDateTime(
  iso: string | null | undefined,
  { style = 'full', timeZone }: DateTimeFormatOptions = {},
): string {
  const date = parseIso(iso)
  if (!date) return EMPTY_VALUE

  return dateFormatter({
    timeZone: timeZone ?? getDisplayTimeZone(),
    day: '2-digit',
    month: '2-digit',
    ...(style === 'full' ? { year: 'numeric', second: '2-digit' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(', ', ' ')
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Ожидание и разговор: `мм:сс`, от часа — `ч:мм:сс`. Бэкенд отдаёт миллисекунды. */
export function formatDurationMs(milliseconds: number | null | undefined): string {
  if (milliseconds === null || milliseconds === undefined || !Number.isFinite(milliseconds)) {
    return EMPTY_VALUE
  }
  return formatDurationSeconds(Math.floor(Math.abs(milliseconds) / 1000))
}

export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return EMPTY_VALUE

  const total = Math.floor(Math.abs(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`
}
