import type { GoogleAdsAccount, GoogleAdsSyncJob } from '../api/types'

export type SyncErrorCategory = 'auth' | 'quota' | 'api' | 'unknown'

export const syncErrorCategoryLabels: Record<SyncErrorCategory, string> = {
  auth: 'Авторизация',
  quota: 'Квота Google Ads',
  api: 'Google Ads API',
  unknown: 'Ошибка синхронизации',
}

export const syncStatusLabels: Record<GoogleAdsSyncJob['status'], string> = {
  running: 'Выполняется',
  success: 'Успешно',
  failed: 'Ошибка',
}

export function syncDurationSeconds(
  startedAt: string,
  finishedAt: string | null,
  now = new Date(),
): number | null {
  const started = new Date(startedAt).getTime()
  const finished = finishedAt ? new Date(finishedAt).getTime() : now.getTime()
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) return null
  return Math.floor((finished - started) / 1000)
}

export function syncAccountSummary(accounts: readonly GoogleAdsAccount[]) {
  return {
    connected: accounts.filter((account) => account.connection_status === 'connected').length,
    running: accounts.filter((account) => account.last_sync_status === 'running').length,
    failed: accounts.filter((account) => account.last_sync_status === 'failed').length,
    stale: accounts.filter((account) => account.last_sync_status === 'stale').length,
  }
}

export function classifySyncError(error: string): SyncErrorCategory {
  const normalized = error.toLowerCase()
  if (/oauth|auth|credential|grant|token|unauthori[sz]ed|forbidden|401|403/.test(normalized)) {
    return 'auth'
  }
  if (/quota|rate.?limit|resource.?exhausted|too many requests|429/.test(normalized)) {
    return 'quota'
  }
  if (/google ads|api|service|server|internal|timeout|5\d\d/.test(normalized)) return 'api'
  return 'unknown'
}

/** Не выводим сырой backend-текст: он может содержать токены, credentials или детали запроса. */
export function safeSyncErrorMessage(error: string): string {
  const category = classifySyncError(error)
  if (category === 'auth') return 'Требуется повторная авторизация Google Ads.'
  if (category === 'quota') return 'Превышена квота Google Ads. Повторите синхронизацию позже.'
  if (category === 'api') return 'Google Ads API временно недоступен. Повторите синхронизацию.'
  return 'Синхронизация завершилась с ошибкой. Повторите запуск или обратитесь к администратору.'
}

export function lastSuccessfulSyncByAccount(
  jobs: readonly GoogleAdsSyncJob[],
): ReadonlyMap<string, string> {
  const result = new Map<string, string>()
  for (const job of jobs) {
    if (job.status !== 'success') continue
    const completedAt = job.finished_at ?? job.started_at
    const current = result.get(job.google_ads_account_id)
    if (!current || new Date(completedAt).getTime() > new Date(current).getTime()) {
      result.set(job.google_ads_account_id, completedAt)
    }
  }
  return result
}
