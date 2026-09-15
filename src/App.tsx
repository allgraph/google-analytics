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

const GoogleAdsAccountsPage = lazy(() =>
  import('./pages/GoogleAdsAccountsPage').then(({ GoogleAdsAccountsPage }) => ({
    default: GoogleAdsAccountsPage,
  })),
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
const KeywordsPage = lazy(() =>
  import('./pages/KeywordsPage').then(({ KeywordsPage }) => ({ default: KeywordsPage })),
)
const SearchTermsPage = lazy(() =>
  import('./pages/SearchTermsPage').then(({ SearchTermsPage }) => ({ default: SearchTermsPage })),
)

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>
}

function AuthorizedIndex() {
  const role = useAppStore((state) => state.currentUser?.role)
  return <Navigate replace to={firstAccessiblePath(role)} />
}

const placeholderRoutes: ReadonlyArray<{ section: Section; path: string; title: string }> = [
  { section: 'dashboard', path: appRoutes.dashboard, title: 'Dashboard' },
  { section: 'campaigns', path: appRoutes.campaigns, title: 'Campaigns' },
  { section: 'adGroups', path: appRoutes.adGroups, title: 'Ad Groups' },
  { section: 'ads', path: appRoutes.ads, title: 'Ads' },
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
            <Route element={<SectionRoute section="adsAccounts" />}>
              <Route
                path={appRoutes.adsAccounts}
                element={
                  <LazyRoute>
                    <GoogleAdsAccountsPage />
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
            <Route element={<SectionRoute section="keywords" />}>
              <Route
                path={appRoutes.keywords}
                element={
                  <LazyRoute>
                    <KeywordsPage />
                  </LazyRoute>
                }
              />
            </Route>
            <Route element={<SectionRoute section="searchTerms" />}>
              <Route
                path={appRoutes.searchTerms}
                element={
                  <LazyRoute>
                    <SearchTermsPage />
                  </LazyRoute>
                }
              />
            </Route>
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
