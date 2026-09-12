import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { firstAccessiblePath } from '../auth/accessPolicy'
import { useAppStore } from '../store/useAppStore'

export function AccessDeniedPage() {
  const role = useAppStore((state) => state.currentUser?.role)
  const navigate = useNavigate()

  return (
    <Result
      status="403"
      title="Нет доступа для вашей роли"
      subTitle="Этот раздел закрыт текущей ролевой политикой."
      extra={
        <Button
          type="primary"
          onClick={() => navigate(firstAccessiblePath(role), { replace: true })}
        >
          Перейти в доступный раздел
        </Button>
      }
    />
  )
}
