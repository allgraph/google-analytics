import { Button, Popover } from 'antd'
import { ChevronDown, UsersRound } from 'lucide-react'
import { useState } from 'react'
import type { GoogleAdsAccount } from '../api/types'
import styles from './GoogleAdsAccountPicker.module.css'

const statusLabels: Record<GoogleAdsAccount['connection_status'], string> = {
  connected: 'подключён',
  disconnected: 'отключён',
  error: 'ошибка OAuth',
}

export function GoogleAdsAccountPicker({
  accounts,
  selectedIds,
  allSelected,
  loading,
  onChange,
  onSelectAll,
}: {
  accounts: GoogleAdsAccount[]
  selectedIds: string[]
  allSelected: boolean
  loading: boolean
  onChange: (ids: string[]) => void
  onSelectAll: () => void
}) {
  const [open, setOpen] = useState(false)
  const selected = new Set(selectedIds)
  const label = allSelected
    ? 'Все аккаунты'
    : selectedIds.length === 0
      ? 'Аккаунты не выбраны'
      : selectedIds.length === 1
        ? (accounts.find((account) => account.id === selectedIds[0])?.name ?? '1 аккаунт')
        : `Аккаунтов: ${selectedIds.length}`

  const toggleAccount = (accountId: string) => {
    onChange(
      selected.has(accountId)
        ? selectedIds.filter((id) => id !== accountId)
        : [...selectedIds, accountId],
    )
  }

  return (
    <Popover
      content={
        <div className={styles.menu} role="menu" aria-label="Google Ads аккаунты">
          <div className={styles.actions}>
            <button type="button" onClick={onSelectAll}>
              Все аккаунты
            </button>
            <button type="button" onClick={() => onChange([])}>
              Снять всё
            </button>
          </div>
          <div className={styles.list}>
            {accounts.map((account) => {
              const checked = selected.has(account.id)
              return (
                <button
                  key={account.id}
                  type="button"
                  className={checked ? styles.selected : undefined}
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  onClick={() => toggleAccount(account.id)}
                >
                  <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
                  <span className={styles.name}>{account.name}</span>
                  <span
                    className={`${styles.status} ${styles[account.connection_status]}`}
                    title={statusLabels[account.connection_status]}
                    aria-label={statusLabels[account.connection_status]}
                  />
                  <span className={styles.customerId}>{account.google_ads_customer_id}</span>
                </button>
              )
            })}
          </div>
        </div>
      }
      open={open}
      placement="bottomLeft"
      trigger="click"
      onOpenChange={setOpen}
    >
      <Button
        className={`${styles.button} ${!allSelected ? styles.active : ''}`}
        disabled={!accounts.length}
        loading={loading}
        aria-label="Выбрать Google Ads аккаунты"
        aria-expanded={open}
      >
        <UsersRound size={15} />
        <span className={styles.buttonLabel}>{label}</span>
        <ChevronDown size={12} />
      </Button>
    </Popover>
  )
}
