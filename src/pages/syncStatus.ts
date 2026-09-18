import type { GoogleAdsAccount, GoogleAdsSyncJob } from '../api/types'

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
