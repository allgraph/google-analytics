import type { RoleCode } from '../api/types'

export const sections = [
  'dashboard',
  'calls',
  'matching',
  'requests',
  'analytics',
  'districts',
  'finance',
  'notifications',
  'settings',
] as const

export type Section = (typeof sections)[number]
export type HiddenFieldGroup = 'money' | 'advertising' | 'staff' | 'recordings' | 'transcripts'

export interface RolePolicy {
  sections: readonly Section[]
  hiddenFields: readonly HiddenFieldGroup[]
}

const projectSections: readonly Section[] = [
  'dashboard',
  'calls',
  'requests',
  'analytics',
  'districts',
  'notifications',
]

/**
 * Временная фронтенд-политика GA-26. Backend пока возвращает роль и scope, но не возвращает
 * матрицу разделов и не вырезает запрещённые поля (C3). Поэтому эта таблица управляет только
 * интерфейсом и не является границей безопасности.
 */
export const rolePolicies: Record<RoleCode, RolePolicy> = {
  owner: {
    sections,
    hiddenFields: [],
  },
  manager: {
    sections: [...projectSections, 'matching', 'finance'],
    hiddenFields: [],
  },
  marketer: {
    sections: [...projectSections, 'matching'],
    hiddenFields: ['money'],
  },
  operator: {
    sections: ['calls', 'requests', 'notifications'],
    hiddenFields: ['money'],
  },
  accountant: {
    sections: [...projectSections, 'finance'],
    hiddenFields: ['advertising'],
  },
  client: {
    sections: [...projectSections, 'finance'],
    hiddenFields: ['staff'],
  },
  technical_admin: {
    sections: ['settings'],
    hiddenFields: ['recordings', 'transcripts'],
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
  return section ? `/${section}` : '/login'
}
