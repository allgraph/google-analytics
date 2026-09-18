import { describe, expect, it } from 'vitest'
import type { GoogleAdsAccount } from '../api/types'
import { syncAccountSummary, syncDurationSeconds } from './syncStatus'

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
})
