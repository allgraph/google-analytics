/**
 * Реестр только актуальных заглушек этапа Google Ads (GA-28).
 *
 * Ссылки на задачи старого call/CRM-продукта удалены после смены ТЗ. Новая запись
 * добавляется сюда только для элемента, который остаётся в активной карте Google Ads.
 */

export type PendingVariant = 'cell' | 'column' | 'filter' | 'action' | 'block' | 'tab' | 'screen'

export interface PendingEntry {
  screen: string
  element: string
  variant: PendingVariant
  issue: string
  note?: string
}

const registry: Record<string, PendingEntry> = {}

export type PendingId = string

export interface ListedPendingEntry extends PendingEntry {
  id: PendingId
}

export function getPendingEntry(id: PendingId): PendingEntry {
  const entry = registry[id]
  if (!entry) throw new Error(`Unknown active pending entry: ${id}`)
  return entry
}

export function listPending(): ListedPendingEntry[] {
  return Object.entries(registry).map(([id, entry]) => ({ id, ...entry }))
}

export function listPendingByIssue(): Array<{ issue: string; entries: ListedPendingEntry[] }> {
  const groups = new Map<string, ListedPendingEntry[]>()
  for (const entry of listPending()) {
    const entries = groups.get(entry.issue) ?? []
    entries.push(entry)
    groups.set(entry.issue, entries)
  }
  return [...groups.entries()].map(([issue, entries]) => ({ issue, entries }))
}

export function pendingTooltip(entry: PendingEntry): string {
  return [entry.element, `ожидает ${entry.issue}`, entry.note].filter(Boolean).join(' · ')
}
