import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { firstAccessiblePath, type Section } from './auth/accessPolicy'
import {
  AnonymousOnlyRoute,
  CurrentUserRoute,
  ProtectedRoute,
  SectionRoute,
} from './components/AuthRoute'
import { RouteLoading } from './components/RouteLoading'
import { AppLayout } from './layouts/AppLayout'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { appRoutes } from './routing/routes'
import { useAppStore } from './store/useAppStore'

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })),
)
const PlaceholderPage = lazy(() =>
  import('./pages/PlaceholderPage').then(({ PlaceholderPage }) => ({ default: PlaceholderPage })),
)
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })),
)
const PendingRegistryPage = lazy(() =>
  import('./pages/PendingRegistryPage').then(({ PendingRegistryPage }) => ({
    default: PendingRegistryPage,
  })),
)

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>
}

function AuthorizedIndex() {
  const role = useAppStore((state) => state.currentUser?.role)
  return <Navigate replace to={firstAccessiblePath(role)} />
}

const placeholderRoutes: ReadonlyArray<{ section: Section; path: string; title: string }> = [
  { section: 'adsAccounts', path: appRoutes.adsAccounts, title: 'Google Ads Accounts' },
  { section: 'campaigns', path: appRoutes.campaigns, title: 'Campaigns' },
  { section: 'adGroups', path: appRoutes.adGroups, title: 'Ad Groups' },
  { section: 'ads', path: appRoutes.ads, title: 'Ads' },
  { section: 'keywords', path: appRoutes.keywords, title: 'Keywords' },
  { section: 'searchTerms', path: appRoutes.searchTerms, title: 'Search Terms' },
  { section: 'geography', path: appRoutes.geography, title: 'Geography' },
  { section: 'devices', path: appRoutes.devices, title: 'Devices' },
  { section: 'syncStatus', path: appRoutes.syncStatus, title: 'Sync / System Status' },
  { section: 'settings', path: appRoutes.settings, title: 'Settings' },
]

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<CurrentUserRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<AuthorizedIndex />} />
            <Route element={<SectionRoute section="dashboard" />}>
              <Route
                path={appRoutes.dashboard}
                element={
                  <LazyRoute>
                    <DashboardPage />
                  </LazyRoute>
                }
              />
            </Route>
            {placeholderRoutes.map(({ section, path, title }) => (
              <Route key={path} element={<SectionRoute section={section} />}>
                <Route
                  path={path}
                  element={
                    <LazyRoute>
                      <PlaceholderPage title={title} />
                    </LazyRoute>
                  }
                />
              </Route>
            ))}
            <Route
              path={appRoutes.accessDenied}
              element={
                <LazyRoute>
                  <AccessDeniedPage />
                </LazyRoute>
              }
            />
            <Route
              path="debug/pending"
              element={
                <LazyRoute>
                  <PendingRegistryPage />
                </LazyRoute>
              }
            />
          </Route>
        </Route>
      </Route>
      <Route element={<AnonymousOnlyRoute />}>
        <Route
          path="login"
          element={
            <LazyRoute>
              <LoginPage />
            </LazyRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
