import { describe, expect, it } from 'vitest'
import { mergePreferences, moveColumn, toggleColumn } from './columnPreferences'

const available = ['time', 'phone', 'status']

describe('mergePreferences', () => {
  it('без сохранённой настройки все колонки видимы в исходном порядке', () => {
    expect(mergePreferences(available, null)).toEqual([
      { key: 'time', visible: true },
      { key: 'phone', visible: true },
      { key: 'status', visible: true },
    ])
  })

  it('сохранённые порядок и видимость применяются', () => {
    const stored = [
      { key: 'status', visible: true },
      { key: 'time', visible: false },
      { key: 'phone', visible: true },
    ]
    expect(mergePreferences(available, stored)).toEqual(stored)
  })

  it('колонки, которых больше нет, отбрасываются', () => {
    const stored = [
      { key: 'removed', visible: true },
      { key: 'time', visible: false },
    ]
    expect(mergePreferences(available, stored).map((p) => p.key)).toEqual([
      'time',
      'phone',
      'status',
    ])
  })

  it('новые колонки добавляются в конец видимыми', () => {
    const stored = [{ key: 'status', visible: false }]
    expect(mergePreferences(available, stored)).toEqual([
      { key: 'status', visible: false },
      { key: 'time', visible: true },
      { key: 'phone', visible: true },
    ])
  })
})

describe('moveColumn', () => {
  const preferences = mergePreferences(available, null)

  it('поднимает колонку', () => {
    expect(moveColumn(preferences, 'phone', -1).map((p) => p.key)).toEqual([
      'phone',
      'time',
      'status',
    ])
  })

  it('за границы списка не выводит', () => {
    expect(moveColumn(preferences, 'time', -1)).toBe(preferences)
    expect(moveColumn(preferences, 'status', 1)).toBe(preferences)
  })
})

describe('toggleColumn', () => {
  it('переключает видимость только нужной колонки', () => {
    const next = toggleColumn(mergePreferences(available, null), 'phone')
    expect(next).toEqual([
      { key: 'time', visible: true },
      { key: 'phone', visible: false },
      { key: 'status', visible: true },
    ])
  })
})
