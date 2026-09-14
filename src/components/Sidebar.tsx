import { Button, Drawer, Menu } from 'antd'
import {
  CreditCard,
  FileText,
  Gauge,
  GitCompareArrows,
  KeyRound,
  Layers,
  MapPinned,
  Monitor,
  RefreshCw,
  Search,
  Settings,
  X,
} from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import type { NavigationItem } from '../types/navigation'
import { canAccessSection } from '../auth/accessPolicy'
import { activeNavigationPath, appRoutes } from '../routing/routes'
import styles from './Sidebar.module.css'

const navigation: NavigationItem[] = [
  { label: 'Dashboard', path: appRoutes.dashboard, section: 'dashboard', icon: Gauge },
  {
    label: 'Google Ads Accounts',
    path: appRoutes.adsAccounts,
    section: 'adsAccounts',
    icon: CreditCard,
  },
  { label: 'Campaigns', path: appRoutes.campaigns, section: 'campaigns', icon: Layers },
  { label: 'Ad Groups', path: appRoutes.adGroups, section: 'adGroups', icon: Layers },
  { label: 'Ads', path: appRoutes.ads, section: 'ads', icon: FileText },
  { label: 'Keywords', path: appRoutes.keywords, section: 'keywords', icon: KeyRound },
  { label: 'Search Terms', path: appRoutes.searchTerms, section: 'searchTerms', icon: Search },
  { label: 'Geography', path: appRoutes.geography, section: 'geography', icon: MapPinned },
  { label: 'Devices', path: appRoutes.devices, section: 'devices', icon: Monitor },
  {
    label: 'Sync / System Status',
    path: appRoutes.syncStatus,
    section: 'syncStatus',
    icon: RefreshCw,
  },
  { label: 'Settings', path: appRoutes.settings, section: 'settings', icon: Settings },
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
  const role = useAppStore((state) => state.currentUser?.role)
  const visibleNavigation = navigation.filter(({ section }) => canAccessSection(role, section))
  const selectedPath = activeNavigationPath(
    pathname,
    visibleNavigation.map(({ path }) => path),
  )

  const content = (
    <>
      <div className={styles.brand}>
        <span className={styles.logo}>
          <GitCompareArrows size={17} />
        </span>
        <div>
          <div className={styles.brandName}>Callgraph</div>
          <div className={styles.tagline}>Google Ads аналитика</div>
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
          selectedKeys={[selectedPath]}
          onClick={({ key, domEvent }) => {
            // Links retain native navigation (including Ctrl/Cmd-click).
            // Menu keyboard activation targets the menu item itself.
            if (domEvent.target instanceof Element && domEvent.target.closest('a')) return
            navigate(key)
            closeSidebar()
          }}
          items={visibleNavigation.map(({ label, path, icon: Icon, badge }) => ({
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
