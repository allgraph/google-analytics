import { useCallback, useMemo, useState } from 'react'

/**
 * Настройка колонок (GA-27): состав и порядок сохраняются на пользователя и экран и переживают
 * перезагрузку страницы.
 */

const STORAGE_PREFIX = 'callgraph.columns'

export interface ColumnPreference {
  key: string
  visible: boolean
}

function storageKey(screen: string, userId: string): string {
  return `${STORAGE_PREFIX}.${screen}.${userId}`
}

function readStored(screen: string, userId: string): ColumnPreference[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(screen, userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null

    return parsed.filter(
      (item): item is ColumnPreference =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ColumnPreference).key === 'string' &&
        typeof (item as ColumnPreference).visible === 'boolean',
    )
  } catch {
    return null
  }
}

function writeStored(screen: string, userId: string, preferences: ColumnPreference[]): void {
  try {
    window.localStorage.setItem(storageKey(screen, userId), JSON.stringify(preferences))
  } catch {
    // Приватный режим или переполненное хранилище: настройка не сохранится, экран не сломается.
  }
}

/**
 * Сохранённый выбор поверх фактического набора колонок: неизвестные ключи отбрасываются,
 * новые колонки добавляются в конец видимыми. Набор колонок меняется от релиза к релизу —
 * сохранённая настройка не должна прятать то, чего раньше не было.
 */
export function mergePreferences(
  available: string[],
  stored: ColumnPreference[] | null,
): ColumnPreference[] {
  if (!stored || stored.length === 0) return available.map((key) => ({ key, visible: true }))

  const known = new Set(available)
  const ordered = stored.filter((preference) => known.has(preference.key))
  const seen = new Set(ordered.map((preference) => preference.key))

  return [
    ...ordered,
    ...available.filter((key) => !seen.has(key)).map((key) => ({ key, visible: true })),
  ]
}

/** Перестановка перетаскиванием: колонка `activeKey` встаёт на место `overKey`. */
export function reorderColumns(
  preferences: ColumnPreference[],
  activeKey: string,
  overKey: string,
): ColumnPreference[] {
  const from = preferences.findIndex((preference) => preference.key === activeKey)
  const to = preferences.findIndex((preference) => preference.key === overKey)
  if (from < 0 || to < 0 || from === to) return preferences

  const next = [...preferences]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function toggleColumn(preferences: ColumnPreference[], key: string): ColumnPreference[] {
  return preferences.map((preference) =>
    preference.key === key ? { ...preference, visible: !preference.visible } : preference,
  )
}

/** «Выбрать все» и «Снять все» — порядок колонок при этом не меняется. */
export function setAllColumns(
  preferences: ColumnPreference[],
  visible: boolean,
): ColumnPreference[] {
  return preferences.map((preference) => ({ ...preference, visible }))
}

export interface ColumnPreferencesApi {
  preferences: ColumnPreference[]
  setPreferences: (preferences: ColumnPreference[]) => void
  /** Ключи видимых колонок в выбранном порядке. */
  visibleKeys: string[]
}

/**
 * `userId` — пока заглушка `anonymous`: текущий пользователь появится в A5 (GA-26).
 * Ключ хранения уже разделён по пользователю, чтобы настройка не перетекала между сессиями.
 */
export function useColumnPreferences(
  screen: string,
  availableKeys: string[],
  userId = 'anonymous',
): ColumnPreferencesApi {
  const [preferences, setStatePreferences] = useState<ColumnPreference[]>(() =>
    mergePreferences(availableKeys, readStored(screen, userId)),
  )

  const setPreferences = useCallback(
    (next: ColumnPreference[]) => {
      setStatePreferences(next)
      writeStored(screen, userId, next)
    },
    [screen, userId],
  )

  const visibleKeys = useMemo(
    () =>
      preferences.filter((preference) => preference.visible).map((preference) => preference.key),
    [preferences],
  )

  return { preferences, setPreferences, visibleKeys }
}
