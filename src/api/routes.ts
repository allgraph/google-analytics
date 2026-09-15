import type { EntityId, GoogleAdsEntityKind } from './types'

const segment = (value: string) => encodeURIComponent(value)

export const apiRoutes = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    setupSecondFactor: '/auth/2fa/setup',
    confirmSecondFactor: '/auth/2fa/confirm',
  },
  currentUser: '/auth/me',
  adsAccounts: {
    list: '/ads-accounts',
    detail: (accountId: EntityId) => `/ads-accounts/${segment(accountId)}`,
  },
  googleAds: {
    oauth: (accountId: EntityId) => `/google-ads/accounts/${segment(accountId)}/oauth`,
    oauthCallback: '/google-ads/oauth/callback',
    connection: (accountId: EntityId) => `/google-ads/accounts/${segment(accountId)}/connection`,
    grant: (accountId: EntityId) => `/google-ads/accounts/${segment(accountId)}/grant`,
    resource: (accountId: EntityId, resource: string) =>
      `/google-ads/accounts/${segment(accountId)}/resources/${segment(resource)}`,
    sync: (accountId: EntityId) => `/google-ads/accounts/${segment(accountId)}/sync`,
    reconcile: (accountId: EntityId) => `/google-ads/accounts/${segment(accountId)}/reconcile`,
    syncJobs: '/google-ads/sync-jobs',
    syncErrors: '/google-ads/sync-errors',
  },
  analytics: {
    overview: '/analytics/overview',
    breakdown: '/analytics/breakdown',
    export: '/analytics/export',
    entities: (accountId: EntityId, entity: GoogleAdsEntityKind) =>
      `/analytics/accounts/${segment(accountId)}/entities/${segment(entity)}`,
    map: '/analytics/map',
    report: (report: string) => `/analytics/reports/${segment(report)}`,
  },
} as const
