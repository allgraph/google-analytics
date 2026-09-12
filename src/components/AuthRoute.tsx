import { useSyncExternalStore } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { tokenStorage } from '../services/tokenStorage'

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
  return useHasSession() ? <Navigate replace to="/dashboard" /> : <Outlet />
}
