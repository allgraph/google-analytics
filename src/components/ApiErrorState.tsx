import { Alert, Result } from 'antd'
import { ApiError } from '../services/api'

interface ApiErrorStateProps {
  error: unknown
}

export function ApiErrorState({ error }: ApiErrorStateProps) {
  if (error instanceof ApiError && error.status === 403) {
    return (
      <Result
        status="403"
        title="Нет доступа"
        subTitle="Ваша роль не разрешает просмотр этого раздела."
      />
    )
  }

  const message = error instanceof Error ? error.message : 'Не удалось загрузить данные'
  // request_id нужен, чтобы по жалобе пользователя нашли конкретный запрос в логах бэкенда.
  const requestId = error instanceof ApiError ? error.requestId : ''

  return (
    <Alert
      showIcon
      type="error"
      message="Ошибка загрузки"
      description={
        <>
          <div>{message}</div>
          {requestId ? <div>request_id: {requestId}</div> : null}
        </>
      }
    />
  )
}
