/**
 * Словари: машинный код → подпись и цвет (GA-29).
 *
 * Подписи и тона взяты из прототипа
 * `project-materials/prototype/Callgraph - сквозная аналитика.html` (`statusDefs`, `confMeta`,
 * набор фильтров). Экраны не заводят собственных подписей статусов и собственных хексов.
 */

import type {
  CallStatus,
  ConfidenceCategory,
  LeadStatus,
  RoleCode,
  UnattributedReason,
} from '../api/types'

export type Tone = 'green' | 'red' | 'amber' | 'gray' | 'indigo'

export interface ToneColors {
  bg: string
  fg: string
  border: string
  dot: string
}

/** Палитра бейджей прототипа: фон, текст, обводка, точка. */
export const toneColors: Record<Tone, ToneColors> = {
  green: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0', dot: '#10b981' },
  red: { bg: '#fff1f2', fg: '#be123c', border: '#fecdd3', dot: '#f43f5e' },
  amber: { bg: '#fffbeb', fg: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  gray: { bg: '#f8fafc', fg: '#475569', border: '#e2e8f0', dot: '#94a3b8' },
  indigo: { bg: '#eef2ff', fg: '#4338ca', border: '#c7d2fe', dot: '#6366f1' },
}

export interface DictionaryEntry {
  label: string
  tone: Tone
}

export type Dictionary<Code extends string> = Record<Code, DictionaryEntry>

/** 13 статусов заявки. */
export const leadStatuses: Dictionary<LeadStatus> = {
  new_call: { label: 'Новый звонок', tone: 'indigo' },
  missed: { label: 'Пропущен', tone: 'red' },
  spam: { label: 'Спам', tone: 'gray' },
  unsuitable: { label: 'Не подходит', tone: 'gray' },
  price_request: { label: 'Запрос цены', tone: 'amber' },
  qualified_lead: { label: 'Качественный лид', tone: 'indigo' },
  master_assigned: { label: 'Назначен мастер', tone: 'indigo' },
  master_departed: { label: 'Мастер выехал', tone: 'amber' },
  order_completed: { label: 'Заказ выполнен', tone: 'green' },
  payment_received: { label: 'Получена оплата', tone: 'green' },
  cancelled: { label: 'Отменён', tone: 'red' },
  refund: { label: 'Возврат', tone: 'red' },
  repeat_order: { label: 'Повторный заказ', tone: 'green' },
}

/**
 * Расхождение машинных кодов с фактическим API.
 *
 * `docs/openapi-backend.yaml` (строка 893) отдаёт `qualified`, `completed` и `paid` там, где
 * согласованный контракт `docs/openapi.yaml` использует `qualified_lead`, `order_completed`
 * и `payment_received`. Состав статусов совпадает, расходятся только имена — гасим здесь,
 * а не правкой типов под реализацию.
 */
export const leadStatusAliases: Record<string, LeadStatus> = {
  qualified: 'qualified_lead',
  completed: 'order_completed',
  paid: 'payment_received',
}

export function resolveLeadStatus(raw: string | null | undefined): LeadStatus | null {
  if (!raw) return null
  if (raw in leadStatuses) return raw as LeadStatus
  return leadStatusAliases[raw] ?? null
}

/** Уверенность сопоставления. */
export const confidenceCategories: Dictionary<ConfidenceCategory> = {
  high: { label: 'Высокая', tone: 'green' },
  probable: { label: 'Вероятное', tone: 'indigo' },
  review: { label: 'Проверка', tone: 'amber' },
  unattributed: { label: 'Не определён', tone: 'gray' },
}

/**
 * Бэкенд объявляет `confidence` свободной строкой без enum (`docs/openapi-backend.yaml`,
 * строка 588), поэтому неизвестное значение сводим к «не определён», а не роняем экран.
 */
export function resolveConfidence(raw: string | null | undefined): ConfidenceCategory {
  return raw && raw in confidenceCategories ? (raw as ConfidenceCategory) : 'unattributed'
}

/** Причины «без источника». */
export const unattributedReasons: Dictionary<UnattributedReason> = {
  over_five_minutes: { label: 'Прошло больше 5 минут', tone: 'gray' },
  no_phone_click: { label: 'Нет нажатия на номер', tone: 'gray' },
  multiple_candidates: { label: 'Несколько кандидатов', tone: 'amber' },
  direct_call: { label: 'Прямой звонок', tone: 'gray' },
}

/** Статус звонка. */
export const callStatuses: Dictionary<CallStatus> = {
  answered: { label: 'Отвечен', tone: 'green' },
  missed: { label: 'Пропущен', tone: 'red' },
}

export type DeviceCode = 'mobile' | 'tablet' | 'desktop'

export const devices: Dictionary<DeviceCode> = {
  mobile: { label: 'Мобильный', tone: 'gray' },
  tablet: { label: 'Планшет', tone: 'gray' },
  desktop: { label: 'Компьютер', tone: 'gray' },
}

/** Семь ролей из `docs/api-contract.md`. */
export const roles: Dictionary<RoleCode> = {
  owner: { label: 'Владелец', tone: 'indigo' },
  manager: { label: 'Руководитель', tone: 'indigo' },
  marketer: { label: 'Маркетолог', tone: 'gray' },
  operator: { label: 'Оператор', tone: 'gray' },
  accountant: { label: 'Бухгалтер', tone: 'gray' },
  client: { label: 'Клиент', tone: 'gray' },
  technical_admin: { label: 'Технический администратор', tone: 'amber' },
}

/**
 * Подпись и тон по коду. Неизвестный код показываем как есть — экран не должен падать
 * из-за значения, которого нет в словаре.
 */
export function getDictionaryEntry<Code extends string>(
  dictionary: Dictionary<Code>,
  code: string | null | undefined,
): DictionaryEntry | null {
  if (!code) return null
  return dictionary[code as Code] ?? { label: code, tone: 'gray' }
}

export function getLabel<Code extends string>(
  dictionary: Dictionary<Code>,
  code: string | null | undefined,
): string | null {
  return getDictionaryEntry(dictionary, code)?.label ?? null
}

/** Список вариантов для фильтров и селектов — в порядке объявления словаря. */
export function dictionaryOptions<Code extends string>(
  dictionary: Dictionary<Code>,
): { value: Code; label: string }[] {
  return (Object.keys(dictionary) as Code[]).map((value) => ({
    value,
    label: dictionary[value].label,
  }))
}
