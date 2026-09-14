export const appRoutes = {
  dashboard: '/dashboard',
  adsAccounts: '/accounts',
  campaigns: '/campaigns',
  adGroups: '/ad-groups',
  ads: '/ads',
  keywords: '/keywords',
  searchTerms: '/search-terms',
  geography: '/geography',
  devices: '/devices',
  syncStatus: '/sync',
  settings: '/settings',
  accessDenied: '/access-denied',
} as const

export function activeNavigationPath(pathname: string, navigationPaths: readonly string[]): string {
  return (
    navigationPaths.find(
      (path) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)),
    ) ?? pathname
  )
}
