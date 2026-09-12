import type { EntityId, PageParams } from './types'

export type QueryFilters = Readonly<Record<string, unknown>>

export const queryKeys = {
  entity: (entity: string) => [entity] as const,
  list: (entity: string, filters: QueryFilters, page: PageParams) =>
    [entity, filters, page] as const,
  detail: (entity: string, id: EntityId) => [entity, 'detail', id] as const,
}

export const serverEntities = {
  calls: 'calls',
  matchingReview: 'matching-review',
  leads: 'leads',
  leadStatusCounts: 'lead-status-counts',
  notifications: 'notifications',
} as const
