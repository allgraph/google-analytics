import { Bell, Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAppStore } from '../store/useAppStore'

export function AppLayout() {
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            aria-label="Открыть меню"
            className="mr-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={toggleSidebar}
            type="button"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm text-slate-500">Аккаунт: Все аккаунты</span>
          <div className="ml-auto flex items-center gap-3">
            <button
              aria-label="Уведомления"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              type="button"
            >
              <Bell size={18} />
            </button>
            <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              АК
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
