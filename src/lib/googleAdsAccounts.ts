import type { GoogleAdsAccount } from '../api/types'
import type { Dictionary } from './dictionaries'

export const googleAdsConnectionStatuses: Dictionary<GoogleAdsAccount['connection_status']> = {
  connected: { label: 'Подключён', tone: 'green' },
  disconnected: { label: 'Отключён', tone: 'gray' },
  error: { label: 'Ошибка OAuth', tone: 'red' },
}

export const googleAdsSyncStatuses: Dictionary<
  Exclude<GoogleAdsAccount['last_sync_status'], null>
> = {
  success: { label: 'Успешно', tone: 'green' },
  running: { label: 'Выполняется', tone: 'indigo' },
  failed: { label: 'Ошибка', tone: 'red' },
  stale: { label: 'Устарело', tone: 'amber' },
}

export interface GoogleAdsAccountSummary {
  connected: number
  syncing: number
  error: number
  disconnected: number
}

export function summarizeGoogleAdsAccounts(
  accounts: readonly GoogleAdsAccount[],
): GoogleAdsAccountSummary {
  return accounts.reduce<GoogleAdsAccountSummary>(
    (summary, account) => {
      if (account.status === 'inactive' || account.connection_status === 'disconnected') {
        summary.disconnected += 1
      } else if (account.connection_status === 'error' || account.last_sync_status === 'failed') {
        summary.error += 1
      } else if (account.last_sync_status === 'running') {
        summary.syncing += 1
      } else {
        summary.connected += 1
      }
      return summary
    },
    { connected: 0, syncing: 0, error: 0, disconnected: 0 },
  )
}

export function normalizeGoogleAdsCustomerId(value: string): string {
  return value.replace(/\D/g, '')
}

export function isGoogleAdsCustomerId(value: string): boolean {
  return /^\d{10}$/.test(normalizeGoogleAdsCustomerId(value))
}

export function formatGoogleAdsCustomerId(value: string): string {
  const normalized = normalizeGoogleAdsCustomerId(value)
  const match = /^(\d{3})(\d{3})(\d{4})$/.exec(normalized)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : value
}
