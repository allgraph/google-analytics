import { describe, expect, it } from 'vitest'
import type { GoogleAdsAccount } from '../api/types'
import type { GoogleAdsSyncJob } from '../api/types'
import {
  classifySyncError,
  lastSuccessfulSyncByAccount,
  safeSyncErrorMessage,
  syncAccountSummary,
  syncDurationSeconds,
} from './syncStatus'

describe('sync status helpers', () => {
  it('calculates completed and running durations', () => {
    expect(syncDurationSeconds('2026-09-18T10:00:00Z', '2026-09-18T10:03:05Z')).toBe(185)
    expect(
      syncDurationSeconds('2026-09-18T10:00:00Z', null, new Date('2026-09-18T10:01:30Z')),
    ).toBe(90)
    expect(syncDurationSeconds('invalid', null)).toBeNull()
  })

  it('summarizes account health independently', () => {
    const account = (overrides: Partial<GoogleAdsAccount>): GoogleAdsAccount =>
      ({
        connection_status: 'connected',
        last_sync_status: 'success',
        ...overrides,
      }) as GoogleAdsAccount
    expect(
      syncAccountSummary([
        account({}),
        account({ last_sync_status: 'running' }),
        account({ connection_status: 'error', last_sync_status: 'failed' }),
        account({ last_sync_status: 'stale' }),
      ]),
    ).toEqual({ connected: 3, running: 1, failed: 1, stale: 1 })
  })

  it('classifies errors without exposing backend details', () => {
    expect(classifySyncError('OAuth refresh token expired: secret-value')).toBe('auth')
    expect(classifySyncError('429 quota exhausted')).toBe('quota')
    expect(classifySyncError('Google Ads API 503')).toBe('api')
    expect(classifySyncError('unexpected worker failure')).toBe('unknown')
    expect(safeSyncErrorMessage('OAuth token=secret-value')).not.toContain('secret-value')
  })

  it('finds the latest successful sync for every account', () => {
    const job = (
      account: string,
      status: GoogleAdsSyncJob['status'],
      finishedAt: string,
    ): GoogleAdsSyncJob =>
      ({
        id: `${account}-${finishedAt}`,
        google_ads_account_id: account,
        started_at: finishedAt,
        finished_at: finishedAt,
        status,
        received: 0,
        inserted: 0,
        updated: 0,
        error: null,
      }) as GoogleAdsSyncJob

    const latest = lastSuccessfulSyncByAccount([
      job('account-1', 'success', '2026-09-18T10:00:00Z'),
      job('account-1', 'failed', '2026-09-19T10:00:00Z'),
      job('account-1', 'success', '2026-09-20T10:00:00Z'),
      job('account-2', 'running', '2026-09-20T10:00:00Z'),
    ])

    expect(latest.get('account-1')).toBe('2026-09-20T10:00:00Z')
    expect(latest.has('account-2')).toBe(false)
  })
})
