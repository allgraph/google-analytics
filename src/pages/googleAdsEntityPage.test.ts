import { describe, expect, it } from 'vitest'
import { searchTermLabel } from './googleAdsEntityPage'

describe('Search Terms privacy', () => {
  it('never substitutes a hidden Google query', () => {
    expect(searchTermLabel({ name: null, privacy_restricted: true })).toBeNull()
    expect(searchTermLabel({ name: 'should not leak', privacy_restricted: true })).toBeNull()
  })

  it('keeps an ordinary visible query', () => {
    expect(searchTermLabel({ name: 'locksmith nearby', privacy_restricted: false })).toBe(
      'locksmith nearby',
    )
  })
})
