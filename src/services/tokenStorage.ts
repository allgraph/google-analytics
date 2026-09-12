export interface TokenPair {
  access_token: string
  refresh_token: string
}

const ACCESS_TOKEN_KEY = 'adcalltrack.access_token'
const REFRESH_TOKEN_KEY = 'adcalltrack.refresh_token'

function withStorage<T>(action: (storage: Storage) => T, fallback: T): T {
  try {
    return typeof window === 'undefined' ? fallback : action(window.localStorage)
  } catch {
    return fallback
  }
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return withStorage((storage) => storage.getItem(ACCESS_TOKEN_KEY), null)
  },

  getRefreshToken(): string | null {
    return withStorage((storage) => storage.getItem(REFRESH_TOKEN_KEY), null)
  },

  setTokens(tokens: TokenPair): void {
    withStorage((storage) => {
      storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
      storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
    }, undefined)
  },

  clear(): void {
    withStorage((storage) => {
      storage.removeItem(ACCESS_TOKEN_KEY)
      storage.removeItem(REFRESH_TOKEN_KEY)
    }, undefined)
  },
}
