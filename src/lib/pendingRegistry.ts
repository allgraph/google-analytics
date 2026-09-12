/**
 * Реестр заглушек «нет данных» (GA-28).
 *
 * Источник правды о том, какие элементы согласованных экранов бэкенд пока не обеспечивает
 * данными. Элементы названы так же, как в прототипе
 * `project-materials/prototype/Callgraph - сквозная аналитика.html`; ключи backend-задач взяты
 * из карты экранов в `docs/api-integration-delta.md`.
 *
 * Снятие заглушки после готовности ручки — удаление одной строки отсюда и подключение данных.
 */

export type PendingVariant = 'cell' | 'column' | 'filter' | 'action' | 'block' | 'tab' | 'screen'

export interface PendingEntry {
  /** Экран из прототипа. */
  screen: string
  /** Подпись элемента — дословно из прототипа. */
  element: string
  /** Как элемент помечается на экране. */
  variant: PendingVariant
  /** Ключ backend-задачи из `docs/api-integration-delta.md`. */
  issue: string
  /** Чего именно ждём, если из подписи не очевидно. */
  note?: string
}

const registry = {
  /* --- Сквозные элементы --- */
  'lists.total': {
    screen: 'Все списки',
    element: 'Показано N из M',
    variant: 'cell',
    issue: 'GA-31',
    note: 'Бэкенд не отдаёт общее число записей: пагинация работает в режиме «есть ли следующая страница»',
  },
  'forms.field-errors': {
    screen: 'Все формы',
    element: 'Подсветка невалидного поля',
    variant: 'block',
    issue: 'GA-32',
  },
  'common.role-field-masking': {
    screen: 'Все экраны',
    element: 'Ролевое урезание полей',
    variant: 'block',
    issue: 'GA-33',
    note: 'Пока выполняется на клиенте',
  },
  'auth.tenant-discovery': {
    screen: 'Вход',
    element: 'Определение tenant до входа',
    variant: 'block',
    issue: 'GA-34',
    note: 'Пока берётся из переменной окружения',
  },
  'header.phone-search': {
    screen: 'Шапка',
    element: 'Поиск по номеру',
    variant: 'filter',
    issue: 'GA-57',
  },
  'header.role-preview': {
    screen: 'Шапка',
    element: 'Просмотр от лица',
    variant: 'action',
    issue: 'GA-57',
  },

  /* --- Дашборд --- */
  'dashboard.funnel': {
    screen: 'Дашборд',
    element: 'Воронка из 8 шагов',
    variant: 'block',
    issue: 'GA-31',
    note: 'Состав `analytics/overview` не покрывает шаги воронки',
  },
  'dashboard.sites-total-row': {
    screen: 'Дашборд',
    element: 'Итоговая строка таблицы «Сайты»',
    variant: 'block',
    issue: 'GA-48',
  },
  'dashboard.callback-share': {
    screen: 'Дашборд',
    element: 'Доля перезвонов по пропущенным',
    variant: 'cell',
    issue: 'GA-46',
  },

  /* --- Звонки --- */
  'calls.filters-extra': {
    screen: 'Звонки',
    element: 'Ещё фильтры (12)',
    variant: 'filter',
    issue: 'GA-36',
  },
  'calls.sorting': {
    screen: 'Звонки',
    element: 'Сортировка по колонке',
    variant: 'column',
    issue: 'GA-36',
    note: 'Бэкенд не принимает параметры сортировки списка звонков',
  },
  'calls.phone-search': {
    screen: 'Звонки',
    element: 'Поиск по номеру',
    variant: 'filter',
    issue: 'GA-36',
  },
  'calls.bulk-actions': {
    screen: 'Звонки',
    element: 'Создать заявки · Назначить оператора · Отметить как спам',
    variant: 'action',
    issue: 'GA-37',
  },
  'calls.recording-column': {
    screen: 'Звонки',
    element: 'Запись',
    variant: 'column',
    issue: 'GA-38',
  },
  'calls.export': {
    screen: 'Звонки',
    element: 'Экспорт звонков',
    variant: 'action',
    issue: 'GA-35',
  },
  'calls.ads-columns-masking': {
    screen: 'Звонки',
    element: 'Скрытие рекламных колонок для роли «Бухгалтер»',
    variant: 'column',
    issue: 'GA-33',
  },

  /* --- Карточка звонка --- */
  'call.client-journey': {
    screen: 'Карточка звонка',
    element: 'Путь клиента',
    variant: 'block',
    issue: 'GA-40',
  },
  'call.client-history': {
    screen: 'Карточка звонка',
    element: 'История обращений · Источник первого и последнего касания',
    variant: 'block',
    issue: 'GA-40',
  },
  'call.recording-player': {
    screen: 'Карточка звонка',
    element: 'Плеер записи',
    variant: 'block',
    issue: 'GA-38',
  },
  'call.analysis': {
    screen: 'Карточка звонка',
    element: 'Расшифровка · Краткое содержание · Извлечённые данные · Сверка · Оценка оператора',
    variant: 'block',
    issue: 'GA-39',
    note: 'Состав ответа `/calls/{id}/analysis` не описан',
  },
  'call.analysis-confirm': {
    screen: 'Карточка звонка',
    element: 'Подтверждение разбора',
    variant: 'action',
    issue: 'GA-39',
  },

  /* --- Сопоставление --- */
  'matching.tab-review': {
    screen: 'Сопоставление',
    element: 'Требуют проверки',
    variant: 'tab',
    issue: 'GA-41',
  },
  'matching.tab-phone-clicks': {
    screen: 'Сопоставление',
    element: 'Нажатия на номер',
    variant: 'tab',
    issue: 'GA-41',
  },
  'matching.tab-unattributed': {
    screen: 'Сопоставление',
    element: 'Без источника',
    variant: 'tab',
    issue: 'GA-41',
  },
  'matching.sidebar-badge': {
    screen: 'Боковое меню',
    element: 'Счётчик «Сопоставление»',
    variant: 'cell',
    issue: 'GA-41',
  },

  /* --- Заявки --- */
  'leads.list': {
    screen: 'Заявки',
    element: 'Список заявок, 14 колонок',
    variant: 'screen',
    issue: 'GA-43',
  },
  'leads.status-counts': {
    screen: 'Заявки',
    element: 'Счётчики по 13 статусам',
    variant: 'block',
    issue: 'GA-44',
  },
  'leads.bulk-actions': {
    screen: 'Заявки',
    element: 'Сменить статус · Назначить мастера · Экспорт',
    variant: 'action',
    issue: 'GA-44',
  },
  'leads.export': {
    screen: 'Заявки',
    element: 'Экспорт',
    variant: 'action',
    issue: 'GA-35',
  },
  'leads.phone-search': {
    screen: 'Заявки',
    element: 'Поиск по телефону',
    variant: 'filter',
    issue: 'GA-57',
  },
  'lead.status-history': {
    screen: 'Карточка заявки',
    element: 'История статусов',
    variant: 'block',
    issue: 'GA-44',
  },
  'lead.client-block': {
    screen: 'Карточка заявки',
    element: 'Клиент',
    variant: 'block',
    issue: 'GA-40',
  },
  'lead.order-ads-spend': {
    screen: 'Карточка заявки',
    element: 'Расход на рекламу и чистая прибыль в экономике заказа',
    variant: 'cell',
    issue: 'GA-50',
  },

  /* --- Смена оператора --- */
  'shift.current': {
    screen: 'Смена оператора',
    element: 'Текущая смена и счётчики',
    variant: 'block',
    issue: 'GA-45',
  },
  'shift.close-conflicts': {
    screen: 'Смена оператора',
    element: 'Какие заявки мешают закрытию',
    variant: 'block',
    issue: 'GA-45',
  },

  /* --- Аналитика --- */
  'analytics.operators-masters': {
    screen: 'Аналитика',
    element: 'Операторы · Мастера',
    variant: 'tab',
    issue: 'GA-47',
  },
  'analytics.missed-calls': {
    screen: 'Аналитика',
    element: 'Пропущенные звонки',
    variant: 'tab',
    issue: 'GA-46',
  },
  'analytics.tree-single-request': {
    screen: 'Аналитика',
    element: 'Дерево одним запросом',
    variant: 'block',
    issue: 'GA-48',
    note: 'Пока дерево строится по уровням',
  },
  'analytics.grand-total': {
    screen: 'Аналитика',
    element: 'Итого по всем аккаунтам',
    variant: 'block',
    issue: 'GA-48',
  },
  'analytics.loss-only': {
    screen: 'Аналитика',
    element: 'Только убыточные',
    variant: 'filter',
    issue: 'GA-48',
  },
  'analytics.export': {
    screen: 'Аналитика',
    element: 'Экспорт отчёта',
    variant: 'action',
    issue: 'GA-35',
  },

  /* --- Районы --- */
  'districts.table': {
    screen: 'Районы',
    element: 'Таблица по районам',
    variant: 'block',
    issue: 'GA-49',
    note: 'Состав ответа `/analytics/map` не описан',
  },
  'districts.map': {
    screen: 'Районы',
    element: 'Карта',
    variant: 'block',
    issue: 'GA-49',
    note: 'Вторая очередь',
  },
  'districts.click-geo': {
    screen: 'Районы',
    element: 'Гео клика',
    variant: 'block',
    issue: 'GA-49',
  },
  'districts.reference': {
    screen: 'Районы',
    element: 'Справочник районов и зон обслуживания',
    variant: 'block',
    issue: 'GA-49',
  },

  /* --- Финансы --- */
  'finance.summary': {
    screen: 'Финансы',
    element: 'Сводка и рентабельность в 5 разрезах',
    variant: 'block',
    issue: 'GA-50',
  },
  'finance.order-economics': {
    screen: 'Финансы',
    element: 'Экономика заказов',
    variant: 'block',
    issue: 'GA-50',
  },
  'finance.attribution': {
    screen: 'Финансы',
    element: 'Атрибуция — выручка без источника',
    variant: 'block',
    issue: 'GA-50',
  },
  'finance.ads-spend-allocation': {
    screen: 'Финансы',
    element: 'Распределение рекламных расходов',
    variant: 'block',
    issue: 'GA-50',
  },
  'finance.repeat-revenue': {
    screen: 'Финансы',
    element: 'Учёт повторной выручки отдельно',
    variant: 'block',
    issue: 'GA-50',
  },
  'finance.export': {
    screen: 'Финансы',
    element: 'Экспорт',
    variant: 'action',
    issue: 'GA-35',
  },

  /* --- Уведомления --- */
  'notifications.recipients': {
    screen: 'Уведомления',
    element: 'Кому отправлять',
    variant: 'filter',
    issue: 'GA-51',
  },
  'notifications.channel': {
    screen: 'Уведомления',
    element: 'Канал',
    variant: 'filter',
    issue: 'GA-51',
  },
  'notifications.condition-types': {
    screen: 'Уведомления',
    element: 'Типы условий (8 штук)',
    variant: 'filter',
    issue: 'GA-51',
  },

  /* --- Настройки --- */
  'settings.tracking-script': {
    screen: 'Настройки → Аккаунты и сайты',
    element: 'Скрипт отслеживания',
    variant: 'column',
    issue: 'GA-52',
  },
  'settings.scoring-impact': {
    screen: 'Настройки → Сопоставление и скоринг',
    element: 'Пересчёт влияния',
    variant: 'action',
    issue: 'GA-42',
  },
  'settings.matching-recalculation': {
    screen: 'Настройки → Сопоставление и скоринг',
    element: 'Пересчёт сопоставления',
    variant: 'action',
    issue: 'GA-42',
  },
  'settings.webhook-log': {
    screen: 'Настройки → Телефония',
    element: 'Журнал вебхуков · Сводный маппинг номеров · Статус подписи',
    variant: 'block',
    issue: 'GA-53',
  },
  'settings.google-ads-status': {
    screen: 'Настройки → Google Ads',
    element: 'Квоты · Уровень доступа · Последняя синхронизация · ValueTrack',
    variant: 'block',
    issue: 'GA-54',
  },
  'settings.permission-matrix': {
    screen: 'Настройки → Пользователи и роли',
    element: 'Матрица прав',
    variant: 'block',
    issue: 'GA-55',
  },
  'settings.last-login': {
    screen: 'Настройки → Пользователи и роли',
    element: 'Последний вход',
    variant: 'column',
    issue: 'GA-55',
  },
  'settings.security-policies': {
    screen: 'Настройки → Безопасность',
    element: 'Политики безопасности',
    variant: 'block',
    issue: 'GA-56',
  },
  'settings.retention': {
    screen: 'Настройки → Безопасность',
    element: 'Сроки хранения',
    variant: 'block',
    issue: 'GA-56',
  },
  'settings.backups': {
    screen: 'Настройки → Безопасность',
    element: 'Резервное копирование',
    variant: 'block',
    issue: 'GA-56',
  },
} as const satisfies Record<string, PendingEntry>

export type PendingId = keyof typeof registry

export const pendingRegistry: Readonly<Record<PendingId, PendingEntry>> = registry

export interface ListedPendingEntry extends PendingEntry {
  id: PendingId
}

/**
 * Запись реестра по ключу. Оформлять заглушку в обход реестра нельзя: неизвестный ключ —
 * ошибка разработки, и в разработке она должна быть шумной.
 */
export function getPendingEntry(id: PendingId): PendingEntry {
  const entry = registry[id]
  if (!entry) throw new Error(`Заглушка «${id}» не найдена в реестре src/lib/pendingRegistry.ts`)
  return entry
}

/** Текст пометки и подсказки: одинаковый во всех вариантах компонента. */
export function pendingTooltip(entry: PendingEntry): string {
  return `Ожидает ${entry.issue}: ${entry.element}`
}

/** Текст подсказки по ключу — там, где нужен только `title`, без обёртки. */
export function pendingTooltipFor(id: PendingId): string {
  return pendingTooltip(getPendingEntry(id))
}

export function listPending(): ListedPendingEntry[] {
  return (Object.keys(registry) as PendingId[]).map((id) => ({ id, ...registry[id] }))
}

/** Активные заглушки, сгруппированные по backend-задаче — для страницы приёмки. */
export function listPendingByIssue(): { issue: string; entries: ListedPendingEntry[] }[] {
  const groups = new Map<string, ListedPendingEntry[]>()
  listPending().forEach((entry) => {
    const group = groups.get(entry.issue)
    if (group) group.push(entry)
    else groups.set(entry.issue, [entry])
  })

  return [...groups.entries()]
    .map(([issue, entries]) => ({ issue, entries }))
    .sort((a, b) => issueNumber(a.issue) - issueNumber(b.issue))
}

function issueNumber(issue: string): number {
  return Number(issue.replace(/\D/g, '')) || 0
}
