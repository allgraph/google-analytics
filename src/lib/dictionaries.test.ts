import { describe, expect, it } from 'vitest'
import {
  dictionaryOptions,
  getDictionaryEntry,
  getLabel,
  googleAdsAccountStatuses,
  googleAdsConnectionStatuses,
  googleAdsEntityStatuses,
  googleAdsSyncStatuses,
  roles,
  toneColors,
} from './dictionaries'

describe('Google Ads dictionaries', () => {
  it('cover every account, connection, sync and entity status', () => {
    expect(Object.keys(googleAdsAccountStatuses)).toEqual(['active', 'inactive'])
    expect(Object.keys(googleAdsConnectionStatuses)).toEqual(['connected', 'disconnected', 'error'])
    expect(Object.keys(googleAdsSyncStatuses)).toEqual(['success', 'running', 'failed', 'stale'])
    expect(Object.keys(googleAdsEntityStatuses)).toEqual(['enabled', 'paused', 'removed'])
  })

  it('uses a defined palette tone for every status', () => {
    for (const dictionary of [
      googleAdsAccountStatuses,
      googleAdsConnectionStatuses,
      googleAdsSyncStatuses,
      googleAdsEntityStatuses,
    ]) {
      for (const entry of Object.values(dictionary)) expect(toneColors[entry.tone]).toBeDefined()
    }
  })

  it('keeps role labels required by the current session UI', () => {
    expect(Object.keys(roles)).toHaveLength(7)
    expect(getLabel(roles, 'owner')).toBe('Владелец')
    expect(getLabel(roles, 'technical_admin')).toBe('Технический администратор')
  })
})

describe('dictionary helpers', () => {
  it('falls back to an unknown machine code without crashing', () => {
    expect(getDictionaryEntry(googleAdsSyncStatuses, 'queued')).toEqual({
      label: 'queued',
      tone: 'gray',
    })
    expect(getDictionaryEntry(googleAdsSyncStatuses, null)).toBeNull()
  })

  it('preserves declaration order in options', () => {
    expect(dictionaryOptions(googleAdsAccountStatuses)).toEqual([
      { value: 'active', label: 'Активен' },
      { value: 'inactive', label: 'Отключён' },
    ])
  })
})
