import { Tooltip } from 'antd'
import type { ReactNode } from 'react'
import { isFieldHidden, type HiddenFieldGroup } from '../auth/accessPolicy'
import { useAppStore } from '../store/useAppStore'
import styles from './RestrictedValue.module.css'

interface RestrictedValueProps {
  field: HiddenFieldGroup
  children: ReactNode
}

/** Единая метка вместо значения, скрытого временной ролевой политикой GA-26. */
export function RestrictedValue({ field, children }: RestrictedValueProps) {
  const role = useAppStore((state) => state.currentUser?.role)

  if (!isFieldHidden(role, field)) return children

  return (
    <Tooltip title="Поле временно скрывается на фронте по текущей роли">
      <span className={styles.restricted}>Скрыто для роли</span>
    </Tooltip>
  )
}
