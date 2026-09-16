import { describe, expect, it } from 'vitest'
import { entityNavigationSearch, searchTermLabel } from './googleAdsEntityPage'

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

describe('Keyword drill-down URL', () => {
  it('keeps context and replaces transient table state', () => {
    const result = entityNavigationSearch(
      '?period=custom&from=2026-08-01&to=2026-09-15&ads_account_ids=one%2Ctwo&campaign_id=c1&ad_group_id=g1&ad_id=a1&page=3&sort=clicks&order=asc&search_term=old',
      { keyword: 'k1' },
      ['search_term'],
    )
    const params = new URLSearchParams(result)

    expect(params.get('keyword')).toBe('k1')
    expect(params.get('ad_id')).toBe('a1')
    expect(params.get('ads_account_ids')).toBe('one,two')
    expect(params.has('page')).toBe(false)
    expect(params.has('sort')).toBe(false)
    expect(params.has('search_term')).toBe(false)
  })
})
