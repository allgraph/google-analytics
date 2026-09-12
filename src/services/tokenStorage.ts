import type { AuthSession } from '../api/types'

const TOKEN_KEYS = {
  accessToken: 'adcalltrack.access_token',
  accessExpiresAt: 'adcalltrack.access_expires_at',
  refreshToken: 'adcalltrack.refresh_token',
  refreshExpiresAt: 'adcalltrack.refresh_expires_at',
  userId: 'adcalltrack.user_id',
  tenantId: 'adcalltrack.tenant_id',
  role: 'adcalltrack.role',
} as const

type TokenListener = () => void
const listeners = new Set<TokenListener>()

function withStorage<T>(action: (storage: Storage) => T, fallback: T): T {
  try {
    return typeof window === 'undefined' ? fallback : action(window.localStorage)
  } catch {
    return fallback
  }
}

function read(key: string): string | null {
  return withStorage((storage) => storage.getItem(key), null)
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener())
}

function isExpired(value: string | null): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  return !Number.isNaN(timestamp) && timestamp <= Date.now()
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return read(TOKEN_KEYS.accessToken)
  },

  getAccessExpiresAt(): string | null {
    return read(TOKEN_KEYS.accessExpiresAt)
  },

  getRefreshToken(): string | null {
    return read(TOKEN_KEYS.refreshToken)
  },

  getRefreshExpiresAt(): string | null {
    return read(TOKEN_KEYS.refreshExpiresAt)
  },

  hasSession(): boolean {
    const refreshToken = this.getRefreshToken()
    return Boolean(refreshToken) && !isExpired(this.getRefreshExpiresAt())
  },

  setTokens(tokens: AuthSession): void {
    withStorage((storage) => {
      storage.setItem(TOKEN_KEYS.accessToken, tokens.access_token)
      storage.setItem(TOKEN_KEYS.accessExpiresAt, tokens.access_expires_at)
      storage.setItem(TOKEN_KEYS.refreshToken, tokens.refresh_token)
      storage.setItem(TOKEN_KEYS.refreshExpiresAt, tokens.refresh_expires_at)
      storage.setItem(TOKEN_KEYS.userId, tokens.user_id)
      storage.setItem(TOKEN_KEYS.tenantId, tokens.tenant_id)
      storage.setItem(TOKEN_KEYS.role, tokens.role)
    }, undefined)
    notifyListeners()
  },

  clear(): void {
    withStorage((storage) => {
      Object.values(TOKEN_KEYS).forEach((key) => storage.removeItem(key))
    }, undefined)
    notifyListeners()
  },

  subscribe(listener: TokenListener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
