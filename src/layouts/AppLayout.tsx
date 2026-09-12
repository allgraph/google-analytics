import { App as AntdApp, Avatar, Button, Dropdown, Layout } from 'antd'
import { Bell, LogOut, Menu, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { logoutAllSessions, logoutCurrentSession } from '../services/auth'
import { useAppStore } from '../store/useAppStore'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { modal } = AntdApp.useApp()
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async (allSessions: boolean) => {
    setSigningOut(true)
    try {
      await (allSessions ? logoutAllSessions() : logoutCurrentSession())
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <Layout className={styles.app}>
      <Sidebar />
      <Layout className={styles.workspace}>
        <Layout.Header className={styles.header}>
          <Button
            aria-label="Открыть меню"
            aria-expanded={sidebarOpen}
            className={`${styles.iconButton} ${styles.menuButton}`}
            icon={<Menu size={20} />}
            onClick={toggleSidebar}
            type="text"
          />
          <span className={styles.account}>Аккаунт: Все аккаунты</span>
          <div className={styles.actions}>
            <Button
              aria-label="Уведомления"
              className={styles.iconButton}
              icon={<Bell size={18} />}
              type="text"
            />
            <Dropdown
              placement="bottomRight"
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'current',
                    icon: <LogOut size={15} />,
                    label: 'Выйти из текущей сессии',
                    disabled: signingOut,
                  },
                  {
                    key: 'all',
                    icon: <ShieldOff size={15} />,
                    label: 'Выйти на всех устройствах',
                    danger: true,
                    disabled: signingOut,
                  },
                ],
                onClick: ({ key }) => {
                  if (key === 'current') {
                    void signOut(false)
                    return
                  }
                  modal.confirm({
                    title: 'Завершить все сессии?',
                    content: 'Потребуется повторный вход на всех устройствах.',
                    okText: 'Выйти везде',
                    cancelText: 'Отмена',
                    okButtonProps: { danger: true },
                    onOk: () => signOut(true),
                  })
                },
              }}
            >
              <Button
                aria-label="Меню пользователя"
                className={styles.profileButton}
                loading={signingOut}
                type="text"
              >
                <Avatar className={styles.avatar}>АК</Avatar>
              </Button>
            </Dropdown>
          </div>
        </Layout.Header>
        <Layout.Content className={styles.content}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
