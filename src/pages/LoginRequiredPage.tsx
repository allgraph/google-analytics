import { Result } from 'antd'

export function LoginRequiredPage() {
  return (
    <Result
      status="warning"
      title="Требуется вход"
      subTitle="Сессия завершена. Войдите в систему снова."
    />
  )
}
