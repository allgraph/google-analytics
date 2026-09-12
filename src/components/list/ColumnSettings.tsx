import { Button, Checkbox, Modal } from 'antd'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  moveColumn,
  toggleColumn,
  type ColumnPreference,
  type ColumnPreferencesApi,
} from '../../lib/columnPreferences'
import styles from './ColumnSettings.module.css'

interface ColumnSettingsProps extends Pick<ColumnPreferencesApi, 'preferences' | 'setPreferences'> {
  open: boolean
  onClose: () => void
  /** Ключ колонки → подпись, как она выглядит в шапке таблицы. */
  labels: Record<string, string>
}

/**
 * «Настроить колонки» (GA-27). Вид повторяет прототип: ширина 520px, отметки и перестановка
 * стрелками, чередование фона строк.
 */
export function ColumnSettings({
  open,
  onClose,
  preferences,
  setPreferences,
  labels,
}: ColumnSettingsProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onClose}
      okText="Готово"
      cancelText="Закрыть"
      width={520}
      title={
        <div>
          <div>Настроить колонки</div>
          <div className={styles.subtitle}>Отметьте нужные колонки и задайте порядок</div>
        </div>
      }
    >
      <ul className={styles.list}>
        {preferences.map((preference: ColumnPreference, index) => (
          <li key={preference.key} className={styles.row}>
            <Checkbox
              checked={preference.visible}
              onChange={() => setPreferences(toggleColumn(preferences, preference.key))}
            >
              {labels[preference.key] ?? preference.key}
            </Checkbox>
            <span className={styles.actions}>
              <Button
                size="small"
                type="text"
                aria-label="Выше"
                disabled={index === 0}
                icon={<ChevronUp size={15} />}
                onClick={() => setPreferences(moveColumn(preferences, preference.key, -1))}
              />
              <Button
                size="small"
                type="text"
                aria-label="Ниже"
                disabled={index === preferences.length - 1}
                icon={<ChevronDown size={15} />}
                onClick={() => setPreferences(moveColumn(preferences, preference.key, 1))}
              />
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
