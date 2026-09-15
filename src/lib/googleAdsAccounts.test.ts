import { describe, expect, it } from 'vitest'
import type { GoogleAdsAccount } from '../api/types'
import {
  formatGoogleAdsCustomerId,
  isGoogleAdsCustomerId,
  normalizeGoogleAdsCustomerId,
  summarizeGoogleAdsAccounts,
} from './googleAdsAccounts'

function account(
  connection: GoogleAdsAccount['connection_status'],
  sync: GoogleAdsAccount['last_sync_status'],
  status: GoogleAdsAccount['status'] = 'active',
): GoogleAdsAccount {
  return {
    id: `${connection}-${sync}`,
    tenant_id: 'tenant',
    name: 'Test account',
    google_ads_customer_id: '1234567890',
    currency_code: 'EUR',
    country_code: 'DE',
    timezone: 'Europe/Berlin',
    status,
    connection_status: connection,
    connected_at: null,
    last_sync_at: null,
    last_sync_status: sync,
    last_sync_error: null,
    created_at: '2026-09-15T10:00:00.000Z',
    updated_at: '2026-09-15T10:00:00.000Z',
  }
}

describe('Google Ads account presentation', () => {
  it('normalizes and formats Customer ID', () => {
    expect(normalizeGoogleAdsCustomerId('123-456-7890')).toBe('1234567890')
    expect(isGoogleAdsCustomerId('123-456-7890')).toBe(true)
    expect(isGoogleAdsCustomerId('123-45')).toBe(false)
    expect(formatGoogleAdsCustomerId('1234567890')).toBe('123-456-7890')
  })

  it('assigns every account to exactly one summary state', () => {
    const summary = summarizeGoogleAdsAccounts([
      account('connected', 'success'),
      account('connected', 'running'),
      account('connected', 'failed'),
      account('error', 'success'),
      account('disconnected', null),
      account('connected', 'success', 'inactive'),
    ])

    expect(summary).toEqual({ connected: 1, syncing: 1, error: 2, disconnected: 2 })
  })
})
