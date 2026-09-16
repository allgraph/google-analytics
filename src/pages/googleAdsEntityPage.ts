import type { GoogleAdsEntitiesQuery, GoogleAdsSearchTerm } from '../api/types'
import type { UrlFiltersApi } from '../lib/useUrlFilters'

export function entityQueryFromUrl(
  filters: UrlFiltersApi,
  searchKey: 'keyword' | 'search_term',
): Omit<GoogleAdsEntitiesQuery, 'entity'> {
  const query = filters.toQueryParams()
  const {
    ads_account_id: _accountId,
    ads_account_ids: _accountIds,
    search_term: _searchTerm,
    ...apiFilters
  } = query
  return {
    ...apiFilters,
    ...(filters.filters[searchKey] ? { [searchKey]: filters.filters[searchKey] } : {}),
  }
}

export function entityNavigationSearch(
  currentSearch: string,
  changes: Record<string, string | null>,
  clear: readonly string[] = [],
): string {
  const params = new URLSearchParams(currentSearch)
  ;['page', 'sort', 'order', ...clear].forEach((key) => params.delete(key))
  Object.entries(changes).forEach(([key, value]) => {
    if (value) params.set(key, value)
    else params.delete(key)
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function searchTermLabel(term: Pick<GoogleAdsSearchTerm, 'name' | 'privacy_restricted'>) {
  if (term.privacy_restricted) return null
  return term.name
}
