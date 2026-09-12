import { useEffect } from 'react'
import { refreshAccessToken } from '../services/api'
import { clearSessionAndRedirect } from '../services/session'
import { tokenStorage } from '../services/tokenStorage'

const REFRESH_LEEWAY_MS = 30_000
const MAX_TIMER_DELAY_MS = 2_147_000_000

function nextRefreshDelay(): number | undefined {
  if (!tokenStorage.getRefreshToken()) return undefined

  const refreshExpiresAt = tokenStorage.getRefreshExpiresAt()
  if (refreshExpiresAt) {
    const refreshExpiresAtMs = Date.parse(refreshExpiresAt)
    if (!Number.isNaN(refreshExpiresAtMs) && refreshExpiresAtMs <= Date.now()) return 0
  }

  const accessExpiresAt = tokenStorage.getAccessExpiresAt()
  if (!accessExpiresAt) return 0
  const accessExpiresAtMs = Date.parse(accessExpiresAt)
  if (Number.isNaN(accessExpiresAtMs)) return 0
  return Math.min(
    MAX_TIMER_DELAY_MS,
    Math.max(0, accessExpiresAtMs - Date.now() - REFRESH_LEEWAY_MS),
  )
}

export function AuthSessionController() {
  useEffect(() => {
    let timer: number | undefined

    const schedule = () => {
      window.clearTimeout(timer)
      const delay = nextRefreshDelay()
      if (delay === undefined) return

      if (delay === 0 && !tokenStorage.hasSession()) {
        clearSessionAndRedirect()
        return
      }

      timer = window.setTimeout(() => {
        void refreshAccessToken().catch(() => undefined)
      }, delay)
    }

    const unsubscribe = tokenStorage.subscribe(schedule)
    schedule()
    return () => {
      unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])

  return null
}
