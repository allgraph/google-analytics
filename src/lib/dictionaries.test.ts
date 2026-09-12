import { describe, expect, it } from 'vitest'
import {
  callStatuses,
  confidenceCategories,
  dictionaryOptions,
  getDictionaryEntry,
  getLabel,
  leadStatusAliases,
  leadStatuses,
  resolveConfidence,
  resolveLeadStatus,
  roles,
  toneColors,
  unattributedReasons,
} from './dictionaries'

describe('статусы заявки', () => {
  it('описаны все 13 статусов', () => {
    expect(Object.keys(leadStatuses)).toHaveLength(13)
  })

  it('у каждого статуса есть подпись и тон из палитры', () => {
    Object.values(leadStatuses).forEach((entry) => {
      expect(entry.label).not.toBe('')
      expect(toneColors[entry.tone]).toBeDefined()
    })
  })

  it('коды фактического API приводятся к согласованным', () => {
    expect(resolveLeadStatus('qualified')).toBe('qualified_lead')
    expect(resolveLeadStatus('completed')).toBe('order_completed')
    expect(resolveLeadStatus('paid')).toBe('payment_received')
    expect(Object.keys(leadStatusAliases)).toHaveLength(3)
  })

  it('согласованный код проходит без изменений', () => {
    expect(resolveLeadStatus('repeat_order')).toBe('repeat_order')
  })

  it('неизвестный код не резолвится', () => {
    expect(resolveLeadStatus('дичь')).toBeNull()
    expect(resolveLeadStatus(null)).toBeNull()
  })
})

describe('уверенность сопоставления', () => {
  it('четыре категории', () => {
    expect(Object.keys(confidenceCategories)).toHaveLength(4)
    expect(getLabel(confidenceCategories, 'high')).toBe('Высокая')
  })

  it('бэкенд отдаёт свободную строку — неизвестное значение сводится к «не определён»', () => {
    expect(resolveConfidence('likely')).toBe('unattributed')
    expect(resolveConfidence(null)).toBe('unattributed')
    expect(resolveConfidence('review')).toBe('review')
  })
})

describe('остальные словари', () => {
  it('четыре причины «без источника»', () => {
    expect(Object.keys(unattributedReasons)).toHaveLength(4)
  })

  it('два статуса звонка', () => {
    expect(getLabel(callStatuses, 'answered')).toBe('Отвечен')
    expect(getLabel(callStatuses, 'missed')).toBe('Пропущен')
  })

  it('семь ролей', () => {
    expect(Object.keys(roles)).toHaveLength(7)
  })
})

describe('getDictionaryEntry', () => {
  it('неизвестный код показывается как есть и не роняет экран', () => {
    expect(getDictionaryEntry(leadStatuses, 'unknown_code')).toEqual({
      label: 'unknown_code',
      tone: 'gray',
    })
  })

  it('пустой код даёт null', () => {
    expect(getDictionaryEntry(leadStatuses, null)).toBeNull()
  })
})

describe('dictionaryOptions', () => {
  it('сохраняет порядок словаря', () => {
    expect(dictionaryOptions(callStatuses)).toEqual([
      { value: 'answered', label: 'Отвечен' },
      { value: 'missed', label: 'Пропущен' },
    ])
  })
})
