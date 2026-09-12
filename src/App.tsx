import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { CallsPage } from './pages/CallsPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginRequiredPage } from './pages/LoginRequiredPage'
import { PendingRegistryPage } from './pages/PendingRegistryPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate replace to="/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="matching" element={<PlaceholderPage title="Сопоставление" />} />
        <Route path="requests" element={<PlaceholderPage title="Заявки" />} />
        <Route path="analytics" element={<PlaceholderPage title="Аналитика" />} />
        <Route path="districts" element={<PlaceholderPage title="Районы" />} />
        <Route path="finance" element={<PlaceholderPage title="Финансы" />} />
        <Route path="notifications" element={<PlaceholderPage title="Уведомления" />} />
        <Route path="settings" element={<PlaceholderPage title="Настройки" />} />
        <Route path="debug/pending" element={<PendingRegistryPage />} />
      </Route>
      <Route path="login" element={<LoginRequiredPage />} />
      <Route path="*" element={<Navigate replace to="/dashboard" />} />
    </Routes>
  )
}
