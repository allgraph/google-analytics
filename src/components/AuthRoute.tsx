import { useEffect, useSyncExternalStore } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { queryKeys } from '../api/queryKeys'
import { apiRoutes } from '../api/routes'
import { useApiQuery } from '../api/hooks'
import type { CurrentUser, DataEnvelope } from '../api/types'
import { canAccessSection, type Section } from '../auth/accessPolicy'
import { tokenStorage } from '../services/tokenStorage'
import { useAppStore } from '../store/useAppStore'
import { ApiErrorState } from './ApiErrorState'
import { AccessDeniedPage } from '../pages/AccessDeniedPage'
import { Skeleton } from 'antd'

function useHasSession(): boolean {
  return useSyncExternalStore(
    tokenStorage.subscribe,
    () => tokenStorage.hasSession(),
    () => false,
  )
}

export function ProtectedRoute() {
  const hasSession = useHasSession()
  const location = useLocation()
  return hasSession ? (
    <Outlet />
  ) : (
    <Navigate replace to="/login" state={{ from: location.pathname }} />
  )
}

export function AnonymousOnlyRoute() {
  return useHasSession() ? <Navigate replace to="/" /> : <Outlet />
}

export function CurrentUserRoute() {
  const currentUser = useAppStore((state) => state.currentUser)
  const setCurrentUser = useAppStore((state) => state.setCurrentUser)
  const clearCurrentUser = useAppStore((state) => state.clearCurrentUser)
  const query = useApiQuery<DataEnvelope<CurrentUser>>(
    queryKeys.entity('current-user'),
    apiRoutes.currentUser,
  )

  useEffect(() => {
    if (query.data) setCurrentUser(query.data.data)
  }, [query.data, setCurrentUser])

  useEffect(() => clearCurrentUser, [clearCurrentUser])

  if (query.isPending) return <Skeleton active paragraph={{ rows: 8 }} />
  if (query.isError) return <ApiErrorState error={query.error} />
  if (!currentUser || currentUser.user_id !== query.data.data.user_id) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }
  return <Outlet />
}

export function SectionRoute({ section }: { section: Section }) {
  const role = useAppStore((state) => state.currentUser?.role)
  return canAccessSection(role, section) ? <Outlet /> : <AccessDeniedPage />
}
