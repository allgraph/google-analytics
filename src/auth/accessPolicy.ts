import type { RoleCode } from '../api/types'

export const sections = [
  'dashboard',
  'adsAccounts',
  'campaigns',
  'adGroups',
  'ads',
  'keywords',
  'searchTerms',
  'geography',
  'devices',
  'syncStatus',
  'settings',
] as const

export type Section = (typeof sections)[number]
export type HiddenFieldGroup = 'money' | 'advertising' | 'staff' | 'recordings' | 'transcripts'

export interface RolePolicy {
  sections: readonly Section[]
  hiddenFields: readonly HiddenFieldGroup[]
}

export const multiRoleUiEnabled = false

const noSections: readonly Section[] = []

/**
 * Новый первый этап работает только в административном режиме. Старые коды ролей остаются в
 * API-типах, чтобы не ломать действующую авторизацию и позже вернуть multi-role UI. Пока backend
 * не ввёл отдельный `administrator`, его эквивалентами являются `owner` и `technical_admin`.
 * Эта политика управляет только интерфейсом и не заменяет проверки доступа на backend.
 */
export const rolePolicies: Record<RoleCode, RolePolicy> = {
  owner: {
    sections,
    hiddenFields: [],
  },
  manager: {
    sections: noSections,
    hiddenFields: [],
  },
  marketer: {
    sections: noSections,
    hiddenFields: ['money'],
  },
  operator: {
    sections: noSections,
    hiddenFields: ['money'],
  },
  accountant: {
    sections: noSections,
    hiddenFields: ['advertising'],
  },
  client: {
    sections: noSections,
    hiddenFields: ['staff'],
  },
  technical_admin: {
    sections,
    hiddenFields: [],
  },
}

export function canAccessSection(role: RoleCode | undefined, section: Section): boolean {
  return role ? (rolePolicies[role]?.sections.includes(section) ?? false) : false
}

export function isFieldHidden(role: RoleCode | undefined, fieldGroup: HiddenFieldGroup): boolean {
  return role ? (rolePolicies[role]?.hiddenFields.includes(fieldGroup) ?? false) : false
}

export function firstAccessiblePath(role: RoleCode | undefined): string {
  const section = role ? rolePolicies[role]?.sections[0] : undefined
  return section ? '/dashboard' : role ? '/access-denied' : '/login'
}
