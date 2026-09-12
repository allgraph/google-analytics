import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Checkbox, Modal } from 'antd'
import { GripVertical } from 'lucide-react'
import {
  reorderColumns,
  setAllColumns,
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
 * порядка. Порядок меняется перетаскиванием — мышью, пальцем и с клавиатуры (dnd-kit).
 */
export function ColumnSettings({
  open,
  onClose,
  preferences,
  setPreferences,
  labels,
}: ColumnSettingsProps) {
  const sensors = useSensors(
    // На тач-экране перетаскивание начинается после удержания, иначе не прокрутить список.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const visibleCount = preferences.filter((preference) => preference.visible).length
  const allVisible = visibleCount === preferences.length
  const someVisible = visibleCount > 0 && !allVisible

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setPreferences(reorderColumns(preferences, String(active.id), String(over.id)))
  }

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
          <div className={styles.subtitle}>
            Отметьте нужные колонки и перетащите их в нужном порядке
          </div>
        </div>
      }
    >
      <div className={styles.toolbar}>
        <Checkbox
          checked={allVisible}
          indeterminate={someVisible}
          onChange={(event) => setPreferences(setAllColumns(preferences, event.target.checked))}
        >
          Выбрать все
        </Checkbox>
        <span className={styles.counter}>
          {visibleCount} из {preferences.length}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={preferences.map((preference) => preference.key)}
          strategy={verticalListSortingStrategy}
        >
          <ul className={styles.list}>
            {preferences.map((preference) => (
              <SortableRow
                key={preference.key}
                preference={preference}
                label={labels[preference.key] ?? preference.key}
                onToggle={() => setPreferences(toggleColumn(preferences, preference.key))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </Modal>
  )
}

interface SortableRowProps {
  preference: ColumnPreference
  label: string
  onToggle: () => void
}

function SortableRow({ preference, label, onToggle }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: preference.key,
  })

  return (
    <li
      ref={setNodeRef}
      className={`${styles.row} ${isDragging ? styles.dragging : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <Button
        type="text"
        size="small"
        className={styles.handle}
        aria-label={`Переместить колонку «${label}»`}
        icon={<GripVertical size={15} />}
        {...attributes}
        {...listeners}
      />
      <Checkbox checked={preference.visible} onChange={onToggle}>
        {label}
      </Checkbox>
    </li>
  )
}
