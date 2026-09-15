import type {
  GoogleAdsAccountStatus,
  GoogleAdsConnectionStatus,
  GoogleAdsEntityStatus,
  GoogleAdsSyncStatus,
  RoleCode,
} from '../api/types'

export type Tone = 'green' | 'red' | 'amber' | 'gray' | 'indigo'

export interface ToneColors {
  bg: string
  fg: string
  border: string
  dot: string
}

export const toneColors: Record<Tone, ToneColors> = {
  green: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0', dot: '#10b981' },
  red: { bg: '#fff1f2', fg: '#be123c', border: '#fecdd3', dot: '#f43f5e' },
  amber: { bg: '#fffbeb', fg: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  gray: { bg: '#f8fafc', fg: '#475569', border: '#e2e8f0', dot: '#94a3b8' },
  indigo: { bg: '#eef2ff', fg: '#4338ca', border: '#c7d2fe', dot: '#6366f1' },
}

export interface DictionaryEntry {
  label: string
  tone: Tone
}

export type Dictionary<Code extends string> = Record<Code, DictionaryEntry>

export const googleAdsAccountStatuses: Dictionary<GoogleAdsAccountStatus> = {
  active: { label: 'Активен', tone: 'green' },
  inactive: { label: 'Отключён', tone: 'gray' },
}

export const googleAdsConnectionStatuses: Dictionary<GoogleAdsConnectionStatus> = {
  connected: { label: 'Подключён', tone: 'green' },
  disconnected: { label: 'Не подключён', tone: 'gray' },
  error: { label: 'Ошибка', tone: 'red' },
}

export const googleAdsSyncStatuses: Dictionary<GoogleAdsSyncStatus> = {
  success: { label: 'Синхронизирован', tone: 'green' },
  running: { label: 'Синхронизация', tone: 'indigo' },
  failed: { label: 'Ошибка', tone: 'red' },
  stale: { label: 'Данные устарели', tone: 'amber' },
}

export const googleAdsEntityStatuses: Dictionary<GoogleAdsEntityStatus> = {
  enabled: { label: 'Включено', tone: 'green' },
  paused: { label: 'Приостановлено', tone: 'amber' },
  removed: { label: 'Удалено', tone: 'gray' },
}

export type DeviceCode = 'MOBILE' | 'TABLET' | 'DESKTOP' | 'OTHER'

export const devices: Dictionary<DeviceCode> = {
  MOBILE: { label: 'Мобильный', tone: 'gray' },
  TABLET: { label: 'Планшет', tone: 'gray' },
  DESKTOP: { label: 'Компьютер', tone: 'gray' },
  OTHER: { label: 'Другой', tone: 'gray' },
}

export const roles: Dictionary<RoleCode> = {
  owner: { label: 'Владелец', tone: 'indigo' },
  manager: { label: 'Руководитель', tone: 'indigo' },
  marketer: { label: 'Маркетолог', tone: 'gray' },
  operator: { label: 'Оператор', tone: 'gray' },
  accountant: { label: 'Бухгалтер', tone: 'gray' },
  client: { label: 'Клиент', tone: 'gray' },
  technical_admin: { label: 'Технический администратор', tone: 'amber' },
}

export function getDictionaryEntry<Code extends string>(
  dictionary: Dictionary<Code>,
  code: string | null | undefined,
): DictionaryEntry | null {
  if (!code) return null
  return dictionary[code as Code] ?? { label: code, tone: 'gray' }
}

export function getLabel<Code extends string>(
  dictionary: Dictionary<Code>,
  code: string | null | undefined,
): string | null {
  return getDictionaryEntry(dictionary, code)?.label ?? null
}

export function dictionaryOptions<Code extends string>(
  dictionary: Dictionary<Code>,
): { value: Code; label: string }[] {
  return (Object.keys(dictionary) as Code[]).map((value) => ({
    value,
    label: dictionary[value].label,
  }))
}
