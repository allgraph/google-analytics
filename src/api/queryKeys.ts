import type { EntityId, PageParams } from './types'

export type QueryFilters = object

export const queryKeys = {
  entity: (entity: string) => [entity] as const,
  filtered: (entity: string, filters: QueryFilters) => [entity, filters] as const,
  list: (entity: string, filters: QueryFilters, page: PageParams) =>
    [entity, filters, page] as const,
  detail: (entity: string, id: EntityId) => [entity, 'detail', id] as const,
}

export const serverEntities = {
  currentUser: 'current-user',
  adsAccounts: 'ads-accounts',
  googleAdsConnections: 'google-ads-connections',
  analyticsOverview: 'analytics-overview',
  analyticsBreakdown: 'analytics-breakdown',
  googleAdsEntities: 'google-ads-entities',
  googleAdsSyncJobs: 'google-ads-sync-jobs',
  googleAdsSyncErrors: 'google-ads-sync-errors',
} as const
