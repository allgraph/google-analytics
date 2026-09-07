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
import { NavLink } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import type { NavigationItem } from '../types/navigation'

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

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const closeSidebar = useAppStore((state) => state.closeSidebar)

  return (
    <>
      {sidebarOpen && (
        <button
          aria-label="Закрыть меню"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={closeSidebar}
          type="button"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <GitCompareArrows size={17} />
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-900">Callgraph</div>
            <div className="text-[11px] text-slate-400">Сквозная аналитика</div>
          </div>
          <button
            aria-label="Закрыть меню"
            className="ml-auto text-slate-400 lg:hidden"
            onClick={closeSidebar}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navigation.map(({ label, path, icon: Icon, badge }) => (
            <NavLink
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] transition-colors ${isActive ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
              }
              key={path}
              onClick={closeSidebar}
              to={path}
            >
              <Icon size={16} />
              <span>{label}</span>
              {badge !== undefined && (
                <span className="ml-auto text-xs font-semibold text-rose-600">{badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4 text-[11px] text-slate-400">
          Версия {import.meta.env.VITE_APP_VERSION}
        </div>
      </aside>
    </>
  )
}
