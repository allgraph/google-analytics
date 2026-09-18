import { describe, expect, it } from 'vitest'
import type { RoleCode } from '../api/types'
import {
  canAccessSection,
  firstAccessiblePath,
  isFieldHidden,
  multiRoleUiEnabled,
  rolePolicies,
  sections,
} from './accessPolicy'

const roles: RoleCode[] = [
  'owner',
  'manager',
  'marketer',
  'operator',
  'accountant',
  'client',
  'technical_admin',
]

describe('rolePolicies', () => {
  it('включает ролевой UI для аналитика', () => {
    expect(multiRoleUiEnabled).toBe(true)
  })

  it('описывает все семь ролей', () => {
    expect(Object.keys(rolePolicies)).toEqual(roles)
  })

  it.each([
    ['owner', sections],
    ['manager', []],
    [
      'marketer',
      [
        'dashboard',
        'campaigns',
        'adGroups',
        'ads',
        'keywords',
        'searchTerms',
        'geography',
        'devices',
      ],
    ],
    ['operator', []],
    ['accountant', []],
    ['client', []],
    ['technical_admin', sections],
  ] as const)('%s получает набор разделов административного режима', (role, allowed) => {
    for (const section of sections) {
      expect(canAccessSection(role, section)).toBe(allowed.includes(section as never))
    }
  })

  it.each([
    ['owner', []],
    ['manager', []],
    ['marketer', ['money']],
    ['operator', ['money']],
    ['accountant', ['advertising']],
    ['client', ['staff']],
    ['technical_admin', ['recordings', 'transcripts']],
  ] as const)('%s получает согласованное маскирование полей', (role, hidden) => {
    for (const field of ['money', 'advertising', 'staff', 'recordings', 'transcripts'] as const) {
      expect(isFieldHidden(role, field)).toBe(hidden.includes(field as never))
    }
  })

  it.each([
    ['owner', '/dashboard'],
    ['manager', '/access-denied'],
    ['marketer', '/dashboard'],
    ['operator', '/access-denied'],
    ['accountant', '/access-denied'],
    ['client', '/access-denied'],
    ['technical_admin', '/dashboard'],
  ] as const)('%s попадает в первый доступный раздел', (role, path) => {
    expect(firstAccessiblePath(role)).toBe(path)
  })
})
