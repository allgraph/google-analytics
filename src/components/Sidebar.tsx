import { Button, Drawer, Menu } from 'antd'
import {
  BarChart3,
  Bell,
  CircleDollarSign,
  Gauge,
  GitCompareArrows,
  MapPinned,
  PhoneCall,
  Settings,
  X,
} from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import type { NavigationItem } from '../types/navigation'
import styles from './Sidebar.module.css'

const navigation: NavigationItem[] = [
  { label: 'Дашборд', path: '/dashboard', icon: Gauge },
  { label: 'Звонки', path: '/calls', icon: PhoneCall },
  { label: 'Сопоставление', path: '/matching', icon: GitCompareArrows, badge: 12 },
  { label: 'Заявки', path: '/requests', icon: BarChart3 },
  { label: 'Аналитика', path: '/analytics', icon: BarChart3 },
  { label: 'Районы', path: '/districts', icon: MapPinned },
  { label: 'Финансы', path: '/finance', icon: CircleDollarSign },
  { label: 'Уведомления', path: '/notifications', icon: Bell },
  { label: 'Настройки', path: '/settings', icon: Settings },
]

const desktopQuery = window.matchMedia('(min-width: 1024px)')
const subscribeDesktop = (onChange: () => void) => {
  desktopQuery.addEventListener('change', onChange)
  return () => desktopQuery.removeEventListener('change', onChange)
}
const getDesktopSnapshot = () => desktopQuery.matches

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const closeSidebar = useAppStore((state) => state.closeSidebar)
  const isDesktop = useSyncExternalStore(subscribeDesktop, getDesktopSnapshot)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const content = (
    <>
      <div className={styles.brand}>
        <span className={styles.logo}>
          <GitCompareArrows size={17} />
        </span>
        <div>
          <div className={styles.brandName}>Callgraph</div>
          <div className={styles.tagline}>Сквозная аналитика</div>
        </div>
        {!isDesktop && (
          <Button
            aria-label="Закрыть меню"
            className={styles.closeButton}
            icon={<X size={18} />}
            onClick={closeSidebar}
            type="text"
          />
        )}
      </div>
      <nav aria-label="Основная навигация" className={styles.navigation}>
        <Menu
          className={styles.menu}
          mode="inline"
          inlineIndent={12}
          selectedKeys={[pathname]}
          onClick={({ key, domEvent }) => {
            // Links retain native navigation (including Ctrl/Cmd-click).
            // Menu keyboard activation targets the menu item itself.
            if (domEvent.target instanceof Element && domEvent.target.closest('a')) return
            navigate(key)
            closeSidebar()
          }}
          items={navigation.map(({ label, path, icon: Icon, badge }) => ({
            key: path,
            label: (
              <NavLink className={styles.link} onClick={closeSidebar} to={path}>
                <Icon size={16} />
                <span>{label}</span>
                {badge !== undefined && <span className={styles.badge}>{badge}</span>}
              </NavLink>
            ),
          }))}
        />
      </nav>
      <div className={styles.version}>Версия {import.meta.env.VITE_APP_VERSION}</div>
    </>
  )

  return isDesktop ? (
    <aside className={styles.sidebar}>{content}</aside>
  ) : (
    <Drawer
      aria-label="Основная навигация"
      placement="left"
      size={240}
      open={sidebarOpen}
      onClose={closeSidebar}
      closable={false}
      classNames={{
        wrapper: styles.drawerWrapper,
        body: styles.drawerBody,
        section: styles.drawerSection,
        mask: styles.drawerMask,
      }}
    >
      {content}
    </Drawer>
  )
}
