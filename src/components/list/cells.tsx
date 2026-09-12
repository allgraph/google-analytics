import { Button, Typography } from 'antd'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EMPTY_VALUE } from '../../lib/emptyValue'
import styles from './cells.module.css'

/**
 * Формы ячеек из прототипа (`callRows`): пилюля, значение с подписью, ссылка, кнопка, иконка
 * и моноширинный текст. Экраны блока B берут их отсюда, а не рисуют по месту.
 */

export function EmptyCell() {
  return <span className={styles.empty}>{EMPTY_VALUE}</span>
}

/** Значение или прочерк — базовый случай для любой колонки. */
export function ValueCell({ value }: { value: ReactNode }) {
  return value === null || value === undefined || value === '' ? <EmptyCell /> : <>{value}</>
}

/** Моноширинные значения: `call_id`, ожидание, разговор. */
export function MonoCell({ value }: { value: string | null | undefined }) {
  if (!value) return <EmptyCell />
  return <span className={styles.mono}>{value}</span>
}

/** Значение и подпись под ним — как «Кампания / Ключ» в списке звонков. */
export function TwoLineCell({ value, sub }: { value: ReactNode; sub?: ReactNode }) {
  if (value === null || value === undefined || value === '') return <EmptyCell />

  return (
    <span className={styles.twoLine}>
      <span>{value}</span>
      {sub ? <span className={styles.sub}>{sub}</span> : null}
    </span>
  )
}

export function LinkCell({ to, label }: { to: string; label: ReactNode }) {
  return (
    <Link className={styles.link} to={to}>
      {label}
    </Link>
  )
}

export function ButtonCell({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Button size="small" onClick={onClick}>
      {label}
    </Button>
  )
}

export function IconCell({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
}) {
  return <Button size="small" type="text" aria-label={label} icon={icon} onClick={onClick} />
}

/** Числовое значение с акцентом: прибыль зелёная, убыток красный — как в прототипе. */
export function SignedCell({ value, formatted }: { value: number | null; formatted: string }) {
  if (value === null) return <EmptyCell />

  return (
    <Typography.Text className={value < 0 ? styles.negative : styles.positive}>
      {formatted}
    </Typography.Text>
  )
}
