import { Tag } from 'antd'
import { EMPTY_VALUE } from '../lib/emptyValue'
import {
  getDictionaryEntry,
  toneColors,
  type Dictionary,
  type DictionaryEntry,
} from '../lib/dictionaries'

interface StatusTagProps<Code extends string> {
  dictionary: Dictionary<Code>
  code: string | null | undefined
  /** Приписка справа от подписи, как `Высокая · 115` в прототипе. */
  suffix?: string | number | null
}

/**
 * Бейдж статуса (GA-29). Единственный потребитель `toneColors` — чтобы хексы не расползались
 * по экранам вместе с копипастой.
 */
export function StatusTag<Code extends string>({ dictionary, code, suffix }: StatusTagProps<Code>) {
  const entry = getDictionaryEntry(dictionary, code)
  if (!entry) return <span>{EMPTY_VALUE}</span>

  return <ToneTag entry={entry} suffix={suffix} />
}

interface ToneTagProps {
  entry: DictionaryEntry
  suffix?: string | number | null
}

export function ToneTag({ entry, suffix }: ToneTagProps) {
  const colors = toneColors[entry.tone]

  return (
    <Tag
      style={{
        margin: 0,
        borderColor: colors.border,
        background: colors.bg,
        color: colors.fg,
        borderRadius: 999,
      }}
    >
      {suffix === null || suffix === undefined ? entry.label : `${entry.label} · ${suffix}`}
    </Tag>
  )
}
