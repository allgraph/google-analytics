import type { GoogleAdsEntitiesQuery, GoogleAdsSearchTerm } from '../api/types'
import type { UrlFiltersApi } from '../lib/useUrlFilters'

export function entityQueryFromUrl(
  filters: UrlFiltersApi,
  searchKey: 'keyword' | 'search_term',
): Omit<GoogleAdsEntitiesQuery, 'entity'> {
  const query = filters.toQueryParams()
  const { ads_account_id: _accountId, ...apiFilters } = query
  return {
    ...apiFilters,
    ...(filters.filters[searchKey] ? { [searchKey]: filters.filters[searchKey] } : {}),
  }
}

export function searchTermLabel(term: Pick<GoogleAdsSearchTerm, 'name' | 'privacy_restricted'>) {
  if (term.privacy_restricted) return null
  return term.name
}
