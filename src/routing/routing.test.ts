import { describe, expect, it } from 'vitest'
import { activeNavigationPath, appRoutes } from './routes'

describe('карта маршрутов GA-83', () => {
  it('содержит только разделы нового этапа и служебную страницу доступа', () => {
    expect(appRoutes).toEqual({
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
    })
  })

  it('оставляет родительский пункт меню активным на вложенном пути', () => {
    const paths = [appRoutes.dashboard, appRoutes.campaigns, appRoutes.adsAccounts]
    expect(activeNavigationPath('/campaigns/42', paths)).toBe('/campaigns')
    expect(activeNavigationPath('/accounts/account-1', paths)).toBe('/accounts')
  })
})
