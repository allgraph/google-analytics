import { Navigate, Route, Routes } from 'react-router-dom'
import {
  AnonymousOnlyRoute,
  CurrentUserRoute,
  ProtectedRoute,
  SectionRoute,
} from './components/AuthRoute'
import { AppLayout } from './layouts/AppLayout'
import { CallsPage } from './pages/CallsPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PendingRegistryPage } from './pages/PendingRegistryPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { firstAccessiblePath } from './auth/accessPolicy'
import { useAppStore } from './store/useAppStore'

function AuthorizedIndex() {
  const role = useAppStore((state) => state.currentUser?.role)
  return <Navigate replace to={firstAccessiblePath(role)} />
}

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<CurrentUserRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<AuthorizedIndex />} />
            <Route element={<SectionRoute section="dashboard" />}>
              <Route path="dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<SectionRoute section="calls" />}>
              <Route path="calls" element={<CallsPage />} />
            </Route>
            <Route element={<SectionRoute section="matching" />}>
              <Route path="matching" element={<PlaceholderPage title="Сопоставление" />} />
            </Route>
            <Route element={<SectionRoute section="requests" />}>
              <Route path="requests" element={<PlaceholderPage title="Заявки" />} />
            </Route>
            <Route element={<SectionRoute section="analytics" />}>
              <Route path="analytics" element={<PlaceholderPage title="Аналитика" />} />
            </Route>
            <Route element={<SectionRoute section="districts" />}>
              <Route path="districts" element={<PlaceholderPage title="Районы" />} />
            </Route>
            <Route element={<SectionRoute section="finance" />}>
              <Route path="finance" element={<PlaceholderPage title="Финансы" />} />
            </Route>
            <Route element={<SectionRoute section="notifications" />}>
              <Route path="notifications" element={<PlaceholderPage title="Уведомления" />} />
            </Route>
            <Route element={<SectionRoute section="settings" />}>
              <Route path="settings" element={<PlaceholderPage title="Настройки" />} />
            </Route>
            <Route path="debug/pending" element={<PendingRegistryPage />} />
          </Route>
        </Route>
      </Route>
      <Route element={<AnonymousOnlyRoute />}>
        <Route path="login" element={<LoginPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
