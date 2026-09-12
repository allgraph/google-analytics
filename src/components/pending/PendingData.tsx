import { Result, Tooltip } from 'antd'
import type { ReactNode } from 'react'
import { EMPTY_VALUE } from '../../lib/emptyValue'
import {
  getPendingEntry,
  pendingTooltip,
  type PendingEntry,
  type PendingId,
  type PendingVariant,
} from '../../lib/pendingRegistry'
import styles from './PendingData.module.css'

interface PendingDataProps {
  id: PendingId
  /** По умолчанию берётся из реестра. */
  variant?: PendingVariant
  children?: ReactNode
}

/**
 * Обёртка заглушки «нет данных» (GA-28).
 *
 * Элемент рисуется в согласованном виде и на своём месте, но неактивен и помечен единообразно.
 * Текст и ключ backend-задачи берутся из реестра `src/lib/pendingRegistry.ts`, а не из места
 * использования.
 */
export function PendingData({ id, variant, children }: PendingDataProps) {
  const entry = getPendingEntry(id)
  const kind = variant ?? entry.variant

  if (kind === 'screen') return <PendingScreen entry={entry} />
  if (kind === 'block' || kind === 'tab') {
    return (
      <PendingBlock entry={entry} className={kind === 'tab' ? styles.tab : styles.block}>
        {children}
      </PendingBlock>
    )
  }

  return (
    <Tooltip title={pendingTooltip(entry)}>
      <span className={`${styles.pending} ${styles[kind]}`} aria-disabled tabIndex={-1}>
        <span className={styles.mark} aria-hidden />
        {children === undefined ? (
          <span className={styles.dash}>{EMPTY_VALUE}</span>
        ) : (
          <span className={styles.content}>{children}</span>
        )}
      </span>
    </Tooltip>
  )
}

interface PendingBlockProps {
  entry: PendingEntry
  className: string
  children?: ReactNode
}

function PendingBlock({ entry, className, children }: PendingBlockProps) {
  return (
    <div className={className} aria-disabled>
      <Tooltip title={pendingTooltip(entry)}>
        <span className={styles.badge}>
          <span className={styles.mark} aria-hidden />
          Нет данных · {entry.issue}
        </span>
      </Tooltip>
      <div className={styles.blockContent} tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}

function PendingScreen({ entry }: { entry: PendingEntry }) {
  return (
    <Result
      className={styles.screen}
      status="info"
      title="Нет данных"
      subTitle={`${entry.element} — ожидает ${entry.issue}`}
    />
  )
}

/** Короткая форма для `render` колонки таблицы. */
export function PendingCell({ id }: { id: PendingId }) {
  return <PendingData id={id} variant="cell" />
}
