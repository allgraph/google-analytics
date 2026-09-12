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
  return <Alert showIcon type="error" message="Ошибка загрузки" description={message} />
}
