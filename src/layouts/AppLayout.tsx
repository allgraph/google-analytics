import { Avatar, Button, Layout } from 'antd'
import { Bell, Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAppStore } from '../store/useAppStore'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)

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
            <Avatar className={styles.avatar}>АК</Avatar>
          </div>
        </Layout.Header>
        <Layout.Content className={styles.content}>
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
