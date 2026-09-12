import type { AuthSession, DataEnvelope, LoginRequest } from '../api/types'
import { apiRoutes } from '../api/routes'
import { apiRequest, ensureFreshAccessToken, publicApiRequest } from './api'
import { clearSessionAndRedirect } from './session'
import { tokenStorage } from './tokenStorage'

const tenantId = import.meta.env.VITE_TENANT_ID?.trim()

export const authConfig = { tenantId } as const

export class AuthConfigurationError extends Error {
  constructor() {
    super('Для входа не настроен VITE_TENANT_ID')
    this.name = 'AuthConfigurationError'
  }
}

export type LoginCredentials = Omit<LoginRequest, 'tenant_id'>

export function isSecondFactorRequired(error: unknown): boolean {
  if (!(error instanceof Error) || !('status' in error) || error.status !== 401) return false
  const code = 'code' in error && typeof error.code === 'string' ? error.code : ''
  const marker = `${code} ${error.message}`.toUpperCase()
  return ['TOTP', '2FA', 'MFA', 'SECOND_FACTOR'].some((value) => marker.includes(value))
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  if (!authConfig.tenantId) throw new AuthConfigurationError()

  const envelope = await publicApiRequest<DataEnvelope<AuthSession>>(apiRoutes.auth.login, {
    method: 'POST',
    body: JSON.stringify({ tenant_id: authConfig.tenantId, ...credentials }),
  })
  tokenStorage.setTokens(envelope.data)
  return envelope.data
}

export async function logoutCurrentSession(): Promise<void> {
  try {
    await ensureFreshAccessToken()
    const refreshToken = tokenStorage.getRefreshToken()
    if (refreshToken) {
      await apiRequest<DataEnvelope<void>>(apiRoutes.auth.logout, {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    }
  } finally {
    clearSessionAndRedirect()
  }
}

export async function logoutAllSessions(): Promise<void> {
  try {
    await apiRequest<DataEnvelope<void>>(apiRoutes.auth.logoutAll, { method: 'POST' })
  } finally {
    clearSessionAndRedirect()
  }
}
