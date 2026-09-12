import { Alert, Button, Card, Form, Input, Radio, Typography } from 'antd'
import { ArrowLeft, GitCompareArrows, KeyRound, LogIn, Mail } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AuthConfigurationError,
  authConfig,
  isSecondFactorRequired,
  login,
  type LoginCredentials,
} from '../services/auth'
import { ApiError } from '../services/api'
import styles from './LoginPage.module.css'

interface PasswordFields {
  email: string
  password: string
}

interface SecondFactorFields {
  code: string
}

type FactorMode = 'totp' | 'recovery'

function loginErrorText(error: unknown, secondFactor = false): string {
  if (error instanceof AuthConfigurationError) return error.message
  if (error instanceof ApiError && error.status === 423) {
    return 'Учётная запись временно заблокирована. Попробуйте позже или обратитесь к администратору.'
  }
  if (error instanceof ApiError && error.status === 401) {
    return secondFactor
      ? 'Код не принят. Проверьте его и попробуйте снова.'
      : 'Неверный email или пароль.'
  }
  return error instanceof Error ? error.message : 'Не удалось выполнить вход. Попробуйте снова.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState<'password' | 'second-factor'>('password')
  const [credentials, setCredentials] = useState<PasswordFields>()
  const [factorMode, setFactorMode] = useState<FactorMode>('totp')
  const [errorText, setErrorText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const completeLogin = async (payload: LoginCredentials, secondFactor = false) => {
    setSubmitting(true)
    setErrorText('')
    try {
      await login(payload)
      const target =
        typeof location.state === 'object' &&
        location.state !== null &&
        'from' in location.state &&
        typeof location.state.from === 'string'
          ? location.state.from
          : '/'
      navigate(target, { replace: true })
    } catch (error) {
      if (!secondFactor && isSecondFactorRequired(error)) {
        setCredentials({ email: payload.email, password: payload.password })
        setStep('second-factor')
      } else {
        setErrorText(loginErrorText(error, secondFactor))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const submitPassword = (values: PasswordFields) => completeLogin(values)

  const submitSecondFactor = ({ code }: SecondFactorFields) => {
    if (!credentials) return
    const factor = factorMode === 'totp' ? { totp_code: code } : { recovery_code: code }
    return completeLogin({ ...credentials, ...factor }, true)
  }

  const returnToPassword = () => {
    setStep('password')
    setCredentials(undefined)
    setErrorText('')
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.logo}>
            <GitCompareArrows size={22} />
          </span>
          <div>
            <div className={styles.brandName}>Callgraph</div>
            <div className={styles.tagline}>Сквозная аналитика</div>
          </div>
        </div>

        <div className={styles.heading}>
          <Typography.Title level={2}>
            {step === 'password' ? 'Вход в систему' : 'Подтверждение входа'}
          </Typography.Title>
          <Typography.Text type="secondary">
            {step === 'password'
              ? 'Введите данные своей учётной записи'
              : 'Используйте код из приложения или резервный код'}
          </Typography.Text>
        </div>

        {!authConfig.tenantId && (
          <Alert
            showIcon
            className={styles.alert}
            type="warning"
            title="Вход ещё не настроен"
            description="Добавьте VITE_TENANT_ID в переменные окружения приложения."
          />
        )}
        {errorText && <Alert showIcon className={styles.alert} type="error" title={errorText} />}

        {step === 'password' ? (
          <Form<PasswordFields> layout="vertical" requiredMark={false} onFinish={submitPassword}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Проверьте формат email' },
              ]}
            >
              <Input
                autoComplete="username"
                prefix={<Mail aria-hidden size={17} />}
                placeholder="name@company.de"
                size="large"
              />
            </Form.Item>
            <Form.Item
              label="Пароль"
              name="password"
              rules={[{ required: true, message: 'Введите пароль' }]}
            >
              <Input.Password
                autoComplete="current-password"
                prefix={<KeyRound aria-hidden size={17} />}
                placeholder="Введите пароль"
                size="large"
              />
            </Form.Item>
            <Button
              block
              htmlType="submit"
              icon={<LogIn size={17} />}
              loading={submitting}
              size="large"
              type="primary"
              disabled={!authConfig.tenantId}
            >
              Войти
            </Button>
          </Form>
        ) : (
          <Form<SecondFactorFields>
            layout="vertical"
            requiredMark={false}
            onFinish={submitSecondFactor}
          >
            <Radio.Group
              block
              className={styles.factorMode}
              optionType="button"
              value={factorMode}
              onChange={(event) => {
                setFactorMode(event.target.value as FactorMode)
                setErrorText('')
              }}
              options={[
                { label: 'Код 2FA', value: 'totp' },
                { label: 'Резервный код', value: 'recovery' },
              ]}
            />
            <Form.Item
              label={factorMode === 'totp' ? 'Шестизначный код' : 'Резервный код'}
              name="code"
              rules={
                factorMode === 'totp'
                  ? [
                      { required: true, message: 'Введите код' },
                      { pattern: /^\d{6}$/, message: 'Код должен состоять из шести цифр' },
                    ]
                  : [{ required: true, message: 'Введите резервный код' }]
              }
            >
              <Input
                autoComplete="one-time-code"
                inputMode={factorMode === 'totp' ? 'numeric' : 'text'}
                maxLength={factorMode === 'totp' ? 6 : undefined}
                placeholder={factorMode === 'totp' ? '000000' : 'Введите резервный код'}
                size="large"
              />
            </Form.Item>
            <Button block htmlType="submit" loading={submitting} size="large" type="primary">
              Подтвердить
            </Button>
            <Button
              block
              className={styles.backButton}
              icon={<ArrowLeft size={16} />}
              onClick={returnToPassword}
              type="text"
            >
              Вернуться к паролю
            </Button>
          </Form>
        )}
      </Card>
      <Typography.Text className={styles.footer}>Защищённый доступ к Callgraph</Typography.Text>
    </main>
  )
}
