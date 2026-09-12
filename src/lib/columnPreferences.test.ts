import { describe, expect, it } from 'vitest'
import { mergePreferences, reorderColumns, setAllColumns, toggleColumn } from './columnPreferences'

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

describe('reorderColumns', () => {
  const preferences = mergePreferences(available, null)

  it('перетаскивание вверх ставит колонку на место цели', () => {
    expect(reorderColumns(preferences, 'status', 'time').map((p) => p.key)).toEqual([
      'status',
      'time',
      'phone',
    ])
  })

  it('перетаскивание вниз сдвигает остальные', () => {
    expect(reorderColumns(preferences, 'time', 'status').map((p) => p.key)).toEqual([
      'phone',
      'status',
      'time',
    ])
  })

  it('видимость при перестановке не меняется', () => {
    const mixed = toggleColumn(preferences, 'phone')
    const reordered = reorderColumns(mixed, 'phone', 'time')
    expect(reordered.find((p) => p.key === 'phone')?.visible).toBe(false)
  })

  it('бросок на самого себя или на неизвестный ключ ничего не меняет', () => {
    expect(reorderColumns(preferences, 'time', 'time')).toBe(preferences)
    expect(reorderColumns(preferences, 'time', 'нет такой')).toBe(preferences)
  })
})

describe('setAllColumns', () => {
  const preferences = mergePreferences(available, null)

  it('снимает все отметки, не трогая порядок', () => {
    expect(setAllColumns(preferences, false)).toEqual([
      { key: 'time', visible: false },
      { key: 'phone', visible: false },
      { key: 'status', visible: false },
    ])
  })

  it('возвращает все отметки', () => {
    const none = setAllColumns(preferences, false)
    expect(setAllColumns(none, true).every((p) => p.visible)).toBe(true)
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
