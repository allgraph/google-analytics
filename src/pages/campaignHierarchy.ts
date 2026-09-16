import type { GoogleAdsEntitiesQuery } from '../api/types'
import type { UrlFiltersApi } from '../lib/useUrlFilters'

export type HierarchyPageKind = 'campaigns' | 'ad-groups' | 'ads'

export function hierarchyEntityQueryFromUrl(
  filters: UrlFiltersApi,
  kind: HierarchyPageKind,
): Omit<GoogleAdsEntitiesQuery, 'entity'> {
  const query = filters.toQueryParams()
  const {
    ads_account_id: _accountId,
    ads_account_ids: _accountIds,
    keyword: _keyword,
    search_term: _searchTerm,
    match_type: _matchType,
    ...params
  } = query

  if (kind === 'campaigns') {
    delete params.campaign_id
    delete params.ad_group_id
    delete params.ad_id
  } else if (kind === 'ad-groups') {
    delete params.ad_group_id
    delete params.ad_id
  } else {
    delete params.ad_id
  }

  return params
}

export function hierarchyReferenceQueryFromUrl(
  filters: UrlFiltersApi,
  includeCampaign = false,
): Omit<GoogleAdsEntitiesQuery, 'entity'> {
  const query = filters.toQueryParams()
  const from = typeof query.from === 'string' ? query.from : undefined
  const to = typeof query.to === 'string' ? query.to : undefined
  return {
    page: 1,
    per_page: 500,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(includeCampaign && filters.filters.campaign_id
      ? { campaign_id: filters.filters.campaign_id }
      : {}),
  }
}

export function hierarchyNavigationSearch(
  currentSearch: string,
  {
    campaignId,
    adGroupId,
  }: {
    campaignId?: string | null
    adGroupId?: string | null
  },
): string {
  const params = new URLSearchParams(currentSearch)
  params.delete('page')
  params.delete('sort')
  params.delete('order')

  if (campaignId === null) params.delete('campaign_id')
  else if (campaignId !== undefined) params.set('campaign_id', campaignId)

  if (adGroupId === null) params.delete('ad_group_id')
  else if (adGroupId !== undefined) params.set('ad_group_id', adGroupId)

  params.delete('ad_id')
  const query = params.toString()
  return query ? `?${query}` : ''
}
