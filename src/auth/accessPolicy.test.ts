import { describe, expect, it } from 'vitest'
import type { RoleCode } from '../api/types'
import {
  canAccessSection,
  firstAccessiblePath,
  isFieldHidden,
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
  it('описывает все семь ролей', () => {
    expect(Object.keys(rolePolicies)).toEqual(roles)
  })

  it.each([
    ['owner', sections],
    [
      'manager',
      [
        'dashboard',
        'calls',
        'requests',
        'analytics',
        'districts',
        'notifications',
        'matching',
        'finance',
      ],
    ],
    [
      'marketer',
      ['dashboard', 'calls', 'requests', 'analytics', 'districts', 'notifications', 'matching'],
    ],
    ['operator', ['calls', 'requests', 'notifications']],
    [
      'accountant',
      ['dashboard', 'calls', 'requests', 'analytics', 'districts', 'notifications', 'finance'],
    ],
    [
      'client',
      ['dashboard', 'calls', 'requests', 'analytics', 'districts', 'notifications', 'finance'],
    ],
    ['technical_admin', ['settings']],
  ] as const)('%s получает согласованный набор разделов', (role, allowed) => {
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
    ['manager', '/dashboard'],
    ['marketer', '/dashboard'],
    ['operator', '/calls'],
    ['accountant', '/dashboard'],
    ['client', '/dashboard'],
    ['technical_admin', '/settings'],
  ] as const)('%s попадает в первый доступный раздел', (role, path) => {
    expect(firstAccessiblePath(role)).toBe(path)
  })
})
