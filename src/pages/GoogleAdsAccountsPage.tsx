import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Steps,
  Table,
} from 'antd'
import type { MenuProps, TableColumnsType } from 'antd'
import {
  CheckCircle2,
  KeyRound,
  Link2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldOff,
  Unplug,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  useAdsAccountsQuery,
  useCheckGoogleAdsConnectionMutation,
  useCompleteGoogleAdsOAuthCallbackMutation,
  useCreateAdsAccountMutation,
  useDisconnectGoogleAdsMutation,
  useRevokeGoogleAdsGrantMutation,
  useStartGoogleAdsOAuthMutation,
  useSyncGoogleAdsAccountMutation,
} from '../api'
import type { AdsAccountWriteRequest, GoogleAdsAccount } from '../api/types'
import { ApiErrorState } from '../components/ApiErrorState'
import { StatusTag } from '../components/StatusTag'
import {
  formatGoogleAdsCustomerId,
  googleAdsConnectionStatuses,
  googleAdsSyncStatuses,
  isGoogleAdsCustomerId,
  normalizeGoogleAdsCustomerId,
  summarizeGoogleAdsAccounts,
} from '../lib/googleAdsAccounts'
import { apiConfig } from '../services/api'
import pageStyles from './Page.module.css'
import styles from './GoogleAdsAccountsPage.module.css'

interface AccountFormValues {
  name: string
  google_ads_customer_id: string
  currency_code: AdsAccountWriteRequest['currency_code']
  country_code: string
  timezone: string
}

const countryOptions = [
  { value: 'DE', label: 'Германия (DE)', timezone: 'Europe/Berlin' },
  { value: 'AT', label: 'Австрия (AT)', timezone: 'Europe/Vienna' },
  { value: 'CH', label: 'Швейцария (CH)', timezone: 'Europe/Zurich' },
]

const timezoneOptions = countryOptions.map(({ timezone }) => ({ value: timezone, label: timezone }))
const currencyOptions = ['EUR', 'CHF'].map((value) => ({ value, label: value }))

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value: string | null, withTime = false): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return withTime ? dateTimeFormatter.format(date) : dateFormatter.format(date)
}

function accountCanAuthorize(account: GoogleAdsAccount): boolean {
  return account.connection_status !== 'connected' || account.status === 'inactive'
}

function localOAuthCallbackPath(authorizationUrl: string): string | null {
  if (apiConfig.mode !== 'mock') return null

  const callback = new URL(authorizationUrl, window.location.origin)
  if (callback.origin !== window.location.origin) return null

  const basePath = new URL(apiConfig.baseUrl, window.location.origin).pathname.replace(/\/$/, '')
  if (callback.pathname !== basePath && !callback.pathname.startsWith(`${basePath}/`)) return null

  const relativePath = callback.pathname.slice(basePath.length) || '/'
  return `${relativePath}${callback.search}`
}

export function GoogleAdsAccountsPage() {
  const { message, modal } = AntdApp.useApp()
  const [form] = Form.useForm<AccountFormValues>()
  const [addOpen, setAddOpen] = useState(false)
  const [oauthPickerOpen, setOauthPickerOpen] = useState(false)
  const [pickedAccountId, setPickedAccountId] = useState<string>()
  const [oauthAccount, setOauthAccount] = useState<GoogleAdsAccount>()
  const [oauthStep, setOauthStep] = useState(0)

  const accountsQuery = useAdsAccountsQuery({ page: 1, per_page: 100 })
  const createAccount = useCreateAdsAccountMutation()
  const startOAuth = useStartGoogleAdsOAuthMutation()
  const completeMockOAuth = useCompleteGoogleAdsOAuthCallbackMutation()
  const checkConnection = useCheckGoogleAdsConnectionMutation()
  const syncAccount = useSyncGoogleAdsAccountMutation()
  const disconnectAccount = useDisconnectGoogleAdsMutation()
  const revokeGrant = useRevokeGoogleAdsGrantMutation()

  const accounts = useMemo(() => accountsQuery.data?.data ?? [], [accountsQuery.data])
  const summary = useMemo(() => summarizeGoogleAdsAccounts(accounts), [accounts])
  const authorizableAccounts = accounts.filter(accountCanAuthorize)
  const total = accountsQuery.data?.meta.total ?? accounts.length

  const closeOauth = () => {
    setOauthAccount(undefined)
    setOauthStep(0)
  }

  const openOauth = (account: GoogleAdsAccount) => {
    setOauthStep(0)
    setOauthAccount(account)
  }

  const handleCreate = async (values: AccountFormValues) => {
    const request: AdsAccountWriteRequest = {
      name: values.name,
      google_ads_customer_id: normalizeGoogleAdsCustomerId(values.google_ads_customer_id),
      currency_code: values.currency_code,
      country_code: values.country_code,
    }
    try {
      const result = await createAccount.mutateAsync(request)
      setAddOpen(false)
      form.resetFields()
      message.success('Аккаунт добавлен. Завершите подключение через Google.')
      openOauth(result.data)
    } catch {
      // Общий MutationCache уже показывает нормализованную ошибку API.
    }
  }

  const handleStartOauth = async () => {
    if (!oauthAccount) return

    const popup = apiConfig.mode === 'real' ? window.open('', 'google-ads-oauth') : null
    try {
      const result = await startOAuth.mutateAsync(oauthAccount.id)
      const callbackPath = localOAuthCallbackPath(result.data.authorization_url)
      if (callbackPath) {
        setOauthStep(1)
        await completeMockOAuth.mutateAsync(callbackPath)
        setOauthStep(3)
        message.success(`${oauthAccount.name} подключён через OAuth`)
        return
      }

      if (popup) {
        popup.location.href = result.data.authorization_url
        setOauthStep(2)
      } else {
        window.location.assign(result.data.authorization_url)
      }
    } catch {
      popup?.close()
    }
  }

  const handleCheckConnection = async (account: GoogleAdsAccount, finishOauth = false) => {
    try {
      const result = await checkConnection.mutateAsync(account.id)
      if (result.data.connected) {
        message.success(`Подключение ${account.name} работает`)
        if (finishOauth) setOauthStep(3)
      } else {
        message.warning(`Для ${account.name} требуется авторизация`)
      }
    } catch {
      // Общий MutationCache уже показывает нормализованную ошибку API.
    }
  }

  const handleSync = async (account: GoogleAdsAccount) => {
    try {
      await syncAccount.mutateAsync({ accountId: account.id })
      message.success(`Синхронизация ${account.name} запущена`)
    } catch {
      // Общий MutationCache уже показывает нормализованную ошибку API.
    }
  }

  const confirmDisconnect = (account: GoogleAdsAccount) => {
    modal.confirm({
      title: `Отключить ${account.name}?`,
      icon: <Unplug size={20} />,
      content:
        'Локальные credentials будут удалены. История и аккаунт сохранятся, глобальный доступ Google останется активным.',
      okText: 'Отключить локально',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        await disconnectAccount.mutateAsync(account.id)
        message.success(`${account.name} отключён локально`)
      },
    })
  }

  const confirmRevoke = (account: GoogleAdsAccount) => {
    modal.confirm({
      title: `Отозвать Google grant для ${account.name}?`,
      icon: <ShieldOff size={20} />,
      content:
        'Google OAuth grant будет отозван явно. Для следующей синхронизации потребуется полная повторная авторизация.',
      okText: 'Отозвать Google grant',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        await revokeGrant.mutateAsync(account.id)
        message.success(`Google grant для ${account.name} отозван`)
      },
    })
  }

  const accountMenu = (account: GoogleAdsAccount): MenuProps => ({
    items: [
      {
        key: 'check',
        icon: <CheckCircle2 size={15} />,
        label: 'Проверить подключение',
        onClick: () => void handleCheckConnection(account),
      },
      {
        key: 'reauthorize',
        icon: <KeyRound size={15} />,
        label: 'Повторно авторизовать',
        onClick: () => openOauth(account),
      },
      { type: 'divider' },
      {
        key: 'disconnect',
        icon: <Unplug size={15} />,
        label: 'Отключить локально',
        danger: true,
        disabled: account.connection_status === 'disconnected',
        onClick: () => confirmDisconnect(account),
      },
      {
        key: 'revoke',
        icon: <ShieldOff size={15} />,
        label: 'Отозвать Google grant',
        danger: true,
        onClick: () => confirmRevoke(account),
      },
    ],
  })

  const actions = (account: GoogleAdsAccount) => {
    const shouldAuthorize = accountCanAuthorize(account)
    const syncing = syncAccount.isPending && syncAccount.variables?.accountId === account.id
    return (
      <Space size={6}>
        <Button
          size="small"
          icon={shouldAuthorize ? <Link2 size={14} /> : <RefreshCw size={14} />}
          loading={syncing}
          onClick={() => (shouldAuthorize ? openOauth(account) : void handleSync(account))}
        >
          {shouldAuthorize ? 'Авторизовать' : 'Синхронизировать'}
        </Button>
        <Dropdown menu={accountMenu(account)} trigger={['click']}>
          <Button
            aria-label={`Действия для ${account.name}`}
            className={styles.moreButton}
            icon={<MoreHorizontal size={16} />}
            size="small"
          />
        </Dropdown>
      </Space>
    )
  }

  const columns: TableColumnsType<GoogleAdsAccount> = [
    {
      title: 'Название',
      dataIndex: 'name',
      fixed: 'left',
      width: 220,
      render: (name: string) => <strong className={styles.accountName}>{name}</strong>,
    },
    {
      title: 'Customer ID',
      dataIndex: 'google_ads_customer_id',
      width: 150,
      render: (value: string) => (
        <span className={styles.mono}>{formatGoogleAdsCustomerId(value)}</span>
      ),
    },
    {
      title: 'Валюта',
      dataIndex: 'currency_code',
      width: 90,
      render: (value: string) => <span className={styles.mono}>{value}</span>,
    },
    { title: 'Часовой пояс', dataIndex: 'timezone', width: 155 },
    {
      title: 'Подключение',
      dataIndex: 'connection_status',
      width: 135,
      render: (value: GoogleAdsAccount['connection_status']) => (
        <StatusTag dictionary={googleAdsConnectionStatuses} code={value} />
      ),
    },
    {
      title: 'Дата подключения',
      dataIndex: 'connected_at',
      width: 150,
      render: (value: string | null) => <span className={styles.mono}>{formatDate(value)}</span>,
    },
    {
      title: 'Последняя синхр.',
      dataIndex: 'last_sync_at',
      width: 175,
      render: (value: string | null) => (
        <span className={styles.mono}>{formatDate(value, true)}</span>
      ),
    },
    {
      title: 'Статус синхр.',
      dataIndex: 'last_sync_status',
      width: 135,
      render: (value: GoogleAdsAccount['last_sync_status']) => (
        <StatusTag dictionary={googleAdsSyncStatuses} code={value} />
      ),
    },
    {
      title: 'Последняя ошибка',
      dataIndex: 'last_sync_error',
      width: 270,
      render: (value: string | null) => (
        <span className={value ? styles.errorText : undefined}>{value || '—'}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      fixed: 'right',
      width: 205,
      render: (_, account) => actions(account),
    },
  ]

  const summaryCards = [
    { key: 'connected', label: 'Подключены', value: summary.connected, tone: styles.green },
    { key: 'syncing', label: 'Синхронизируются', value: summary.syncing, tone: styles.indigo },
    { key: 'error', label: 'С ошибкой', value: summary.error, tone: styles.red },
    { key: 'disconnected', label: 'Отключены', value: summary.disconnected, tone: styles.gray },
  ]

  const openPicker = () => {
    if (authorizableAccounts.length === 1) {
      openOauth(authorizableAccounts[0])
      return
    }
    setPickedAccountId(authorizableAccounts[0]?.id)
    setOauthPickerOpen(true)
  }

  return (
    <div className={`${pageStyles.page} ${styles.page}`}>
      <div className={styles.heading}>
        <div>
          <h1 className={pageStyles.title}>Google Ads Accounts</h1>
          <p className={styles.subtitle}>Независимые подключения Google Ads</p>
        </div>
        <Space wrap className={styles.headingActions}>
          <Button
            icon={<Link2 size={15} />}
            disabled={!authorizableAccounts.length}
            onClick={openPicker}
          >
            Подключить через Google
          </Button>
          <Button type="primary" icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
            Добавить аккаунт
          </Button>
        </Space>
      </div>

      <Alert
        showIcon
        type="info"
        title="Аккаунты подключаются независимо"
        description="MCC, Manager Account и CustomerClientLink не используются и не создаются."
      />

      <div className={styles.summary}>
        {summaryCards.map((item) => (
          <Card key={item.key} loading={accountsQuery.isLoading} className={styles.summaryCard}>
            <span className={`${styles.summaryDot} ${item.tone}`} />
            <div>
              <div className={styles.summaryLabel}>{item.label}</div>
              <strong className={styles.summaryValue}>{item.value}</strong>
            </div>
          </Card>
        ))}
      </div>

      {accountsQuery.isError ? (
        <div className={styles.errorState}>
          <ApiErrorState error={accountsQuery.error} />
          <Button loading={accountsQuery.isFetching} onClick={() => void accountsQuery.refetch()}>
            Повторить
          </Button>
        </div>
      ) : (
        <section className={styles.accounts} aria-labelledby="accounts-heading">
          <div className={styles.tableHeading}>
            <div>
              <h2 id="accounts-heading">{total} независимых аккаунтов</h2>
              <p>OAuth, подключение и синхронизация управляются отдельно для каждого аккаунта</p>
            </div>
            <Button
              icon={<RefreshCw size={15} />}
              loading={accountsQuery.isFetching}
              onClick={() => void accountsQuery.refetch()}
            >
              Обновить
            </Button>
          </div>

          <div className={styles.desktopTable}>
            <Table<GoogleAdsAccount>
              columns={columns}
              dataSource={accounts}
              loading={accountsQuery.isLoading}
              locale={{
                emptyText: (
                  <Empty
                    description="Google Ads аккаунты ещё не добавлены"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button type="primary" onClick={() => setAddOpen(true)}>
                      Добавить первый аккаунт
                    </Button>
                  </Empty>
                ),
              }}
              pagination={false}
              rowKey="id"
              scroll={{ x: 1685 }}
            />
          </div>

          <div className={styles.mobileAccounts}>
            {accountsQuery.isLoading ? <Card loading /> : null}
            {!accountsQuery.isLoading && !accounts.length ? (
              <Empty description="Google Ads аккаунты ещё не добавлены">
                <Button type="primary" onClick={() => setAddOpen(true)}>
                  Добавить первый аккаунт
                </Button>
              </Empty>
            ) : null}
            {accounts.map((account) => (
              <Card key={account.id} className={styles.accountCard}>
                <div className={styles.cardTitle}>
                  <strong>{account.name}</strong>
                  <StatusTag
                    dictionary={googleAdsConnectionStatuses}
                    code={account.connection_status}
                  />
                </div>
                <dl className={styles.accountDetails}>
                  <div>
                    <dt>Customer ID</dt>
                    <dd>{formatGoogleAdsCustomerId(account.google_ads_customer_id)}</dd>
                  </div>
                  <div>
                    <dt>Валюта</dt>
                    <dd>{account.currency_code}</dd>
                  </div>
                  <div>
                    <dt>Часовой пояс</dt>
                    <dd>{account.timezone}</dd>
                  </div>
                  <div>
                    <dt>Подключён</dt>
                    <dd>{formatDate(account.connected_at)}</dd>
                  </div>
                  <div>
                    <dt>Последняя синхр.</dt>
                    <dd>{formatDate(account.last_sync_at, true)}</dd>
                  </div>
                  <div>
                    <dt>Статус синхр.</dt>
                    <dd>
                      <StatusTag
                        dictionary={googleAdsSyncStatuses}
                        code={account.last_sync_status}
                      />
                    </dd>
                  </div>
                  <div className={styles.fullDetail}>
                    <dt>Последняя ошибка</dt>
                    <dd className={account.last_sync_error ? styles.errorText : undefined}>
                      {account.last_sync_error || '—'}
                    </dd>
                  </div>
                </dl>
                <div className={styles.cardActions}>{actions(account)}</div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Modal
        title="Добавить Google Ads аккаунт"
        open={addOpen}
        okText="Добавить и авторизовать"
        cancelText="Отмена"
        confirmLoading={createAccount.isPending}
        onCancel={() => setAddOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <p className={styles.modalSubtitle}>Аккаунт добавляется как независимое подключение.</p>
        <Alert
          className={styles.modalAlert}
          type="info"
          showIcon
          title="MCC и административные связи между аккаунтами не создаются."
        />
        <Form<AccountFormValues>
          form={form}
          layout="vertical"
          initialValues={{
            currency_code: 'EUR',
            country_code: 'DE',
            timezone: 'Europe/Berlin',
          }}
          onFinish={(values) => void handleCreate(values)}
          onValuesChange={(changed) => {
            if (!changed.country_code) return
            const country = countryOptions.find((item) => item.value === changed.country_code)
            if (country) form.setFieldValue('timezone', country.timezone)
          }}
        >
          <Form.Item
            name="name"
            label="Название аккаунта"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input placeholder="Например, Notdienst Linz" />
          </Form.Item>
          <Form.Item
            name="google_ads_customer_id"
            label="Google Ads Customer ID"
            validateTrigger="onBlur"
            rules={[
              { required: true },
              {
                validator: (_, value: string) => {
                  if (!value || isGoogleAdsCustomerId(value)) return Promise.resolve()
                  return Promise.reject(new Error('Используйте формат 000-000-0000'))
                },
              },
              {
                validator: (_, value: string) => {
                  const normalized = normalizeGoogleAdsCustomerId(value || '')
                  const duplicate = accounts.find(
                    (account) =>
                      normalizeGoogleAdsCustomerId(account.google_ads_customer_id) === normalized,
                  )
                  return duplicate
                    ? Promise.reject(new Error(`Аккаунт уже добавлен как «${duplicate.name}»`))
                    : Promise.resolve()
                },
              },
            ]}
          >
            <Input className={styles.monoInput} placeholder="000-000-0000" />
          </Form.Item>
          <div className={styles.formGrid}>
            <Form.Item name="currency_code" label="Валюта" rules={[{ required: true }]}>
              <Select options={currencyOptions} />
            </Form.Item>
            <Form.Item name="country_code" label="Страна" rules={[{ required: true }]}>
              <Select options={countryOptions} />
            </Form.Item>
          </div>
          <Form.Item name="timezone" label="Часовой пояс" rules={[{ required: true }]}>
            <Select options={timezoneOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Выберите аккаунт для OAuth"
        open={oauthPickerOpen}
        okText="Продолжить"
        cancelText="Отмена"
        okButtonProps={{ disabled: !pickedAccountId }}
        onCancel={() => setOauthPickerOpen(false)}
        onOk={() => {
          const account = accounts.find((item) => item.id === pickedAccountId)
          setOauthPickerOpen(false)
          if (account) openOauth(account)
        }}
      >
        <Select
          className={styles.accountSelect}
          value={pickedAccountId}
          options={authorizableAccounts.map((account) => ({
            value: account.id,
            label: `${account.name} · ${formatGoogleAdsCustomerId(account.google_ads_customer_id)}`,
          }))}
          onChange={setPickedAccountId}
        />
      </Modal>

      <Modal
        title={oauthAccount ? `OAuth · ${oauthAccount.name}` : 'Google OAuth'}
        open={Boolean(oauthAccount)}
        cancelText="Закрыть"
        okText={
          oauthStep === 3
            ? 'Завершить подключение'
            : oauthStep === 2
              ? 'Проверить подключение'
              : 'Открыть Google OAuth'
        }
        confirmLoading={
          startOAuth.isPending || completeMockOAuth.isPending || checkConnection.isPending
        }
        onCancel={closeOauth}
        onOk={() => {
          if (!oauthAccount) return
          if (oauthStep === 3) closeOauth()
          else if (oauthStep === 2) void handleCheckConnection(oauthAccount, true)
          else void handleStartOauth()
        }}
        width={620}
      >
        <p className={styles.modalSubtitle}>
          Customer ID{' '}
          {oauthAccount ? formatGoogleAdsCustomerId(oauthAccount.google_ads_customer_id) : '—'}
        </p>
        <Alert
          className={styles.modalAlert}
          type="info"
          showIcon
          title="Подключение выполняется напрямую к выбранному аккаунту."
          description="Приложение не использует MCC, Manager Account или CustomerClientLink."
        />
        <Steps
          className={styles.oauthSteps}
          current={oauthStep}
          orientation="vertical"
          items={[
            {
              title: 'Выбор аккаунта Google',
              content: 'Администратор выбирает нужный Google Ads аккаунт.',
            },
            {
              title: 'Согласие на доступ',
              content: 'Google запрашивает разрешение на работу с рекламой.',
            },
            {
              title: 'Безопасный обмен кода',
              content: 'Refresh token сохраняется только на сервере.',
            },
            {
              title: 'Получение данных',
              content: 'Подключение проверяется и готово к синхронизации.',
            },
          ]}
        />
        {oauthStep === 3 ? (
          <Alert type="success" showIcon title="OAuth-подключение подтверждено" />
        ) : null}
      </Modal>
    </div>
  )
}
