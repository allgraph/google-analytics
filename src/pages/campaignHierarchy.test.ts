import { describe, expect, it } from 'vitest'
import { hierarchyNavigationSearch } from './campaignHierarchy'

describe('Google Ads hierarchy URL', () => {
  it('keeps the selected period and account when drilling into a campaign', () => {
    const search = hierarchyNavigationSearch(
      '?period=last30&ads_account_id=account-1&page=3&sort=spend&order=desc',
      { campaignId: 'campaign-7', adGroupId: null },
    )

    expect(new URLSearchParams(search)).toEqual(
      new URLSearchParams('period=last30&ads_account_id=account-1&campaign_id=campaign-7'),
    )
  })

  it('keeps parent ids when drilling into an ad group', () => {
    const search = hierarchyNavigationSearch(
      '?period=last90&ads_account_id=account-1&campaign_id=campaign-7',
      { campaignId: 'campaign-7', adGroupId: 'group-3' },
    )

    expect(new URLSearchParams(search).get('ad_group_id')).toBe('group-3')
    expect(new URLSearchParams(search).get('campaign_id')).toBe('campaign-7')
  })

  it('clears child hierarchy ids when navigating back to campaigns', () => {
    const search = hierarchyNavigationSearch(
      '?period=last30&ads_account_id=account-1&campaign_id=campaign-7&ad_group_id=group-3&ad_id=ad-2',
      { campaignId: null, adGroupId: null },
    )
    const params = new URLSearchParams(search)

    expect(params.get('period')).toBe('last30')
    expect(params.get('ads_account_id')).toBe('account-1')
    expect(params.has('campaign_id')).toBe(false)
    expect(params.has('ad_group_id')).toBe(false)
    expect(params.has('ad_id')).toBe(false)
  })

  it('adds the selected ad while preserving multi-account and custom-period context', () => {
    const search = hierarchyNavigationSearch(
      '?period=custom&from=2026-08-01&to=2026-09-15&ads_account_ids=one%2Ctwo',
      { campaignId: 'campaign-7', adGroupId: 'group-3', adId: 'ad-2' },
    )
    const params = new URLSearchParams(search)

    expect(params.get('from')).toBe('2026-08-01')
    expect(params.get('to')).toBe('2026-09-15')
    expect(params.get('ads_account_ids')).toBe('one,two')
    expect(params.get('ad_id')).toBe('ad-2')
  })
})
