import { parseErrorEnvelope, parseSuccessEnvelope } from '../api/adapters'
import { apiRoutes } from '../api/routes'
import type { AuthSession, DataEnvelope, ErrorBody } from '../api/types'
import { clearSessionAndRedirect } from './session'
import { tokenStorage } from './tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const AUTH_LOGIN_PATH = apiRoutes.auth.login
const AUTH_REFRESH_PATH = apiRoutes.auth.refresh
const REFRESH_LEEWAY_MS = 30_000

export const apiConfig = {
  baseUrl: API_BASE_URL,
  mode: import.meta.env.VITE_API_MODE,
  timeout: 15_000,
} as const

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string[]>
  readonly requestId: string
  readonly retryAfterMs?: number

  constructor(status: number, error: ErrorBody, retryAfterMs?: number) {
    super(error.message)
    this.name = 'ApiError'
    this.status = status
    this.code = error.code
    this.fieldErrors = error.field_errors
    this.requestId = error.request_id
    this.retryAfterMs = retryAfterMs
  }
}

interface RawResponse {
  response: Response
  payload: unknown
}

interface SendOptions {
  includeAccessToken?: boolean
}

interface RequestOptions extends SendOptions {
  canRefresh?: boolean
}

let refreshPromise: Promise<void> | undefined

function joinApiPath(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return { data: undefined }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return undefined

  return response.json()
}

function retryAfterMilliseconds(value: string | null): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000

  const date = Date.parse(value)
  if (Number.isNaN(date)) return undefined
  return Math.max(0, date - Date.now())
}

function apiErrorFromResponse(response: Response, payload: unknown): ApiError {
  const fallbackRequestId = response.headers.get('x-request-id') ?? ''
  const { error } = parseErrorEnvelope(payload, fallbackRequestId)
  return new ApiError(
    response.status,
    error,
    retryAfterMilliseconds(response.headers.get('retry-after')),
  )
}

function networkError(didTimeout: boolean): ApiError {
  return new ApiError(0, {
    code: didTimeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
    message: didTimeout
      ? 'Превышено время ожидания ответа сервера'
      : 'Не удалось связаться с сервером',
    field_errors: {},
    request_id: '',
  })
}

async function send(
  path: string,
  init: RequestInit = {},
  { includeAccessToken = true }: SendOptions = {},
): Promise<RawResponse> {
  const controller = new AbortController()
  let didTimeout = false
  const timeout = window.setTimeout(() => {
    didTimeout = true
    controller.abort('timeout')
  }, apiConfig.timeout)
  const abortFromCaller = () => controller.abort(init.signal?.reason)
  if (init.signal?.aborted) abortFromCaller()
  else init.signal?.addEventListener('abort', abortFromCaller, { once: true })

  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const accessToken = includeAccessToken ? tokenStorage.getAccessToken() : null
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  try {
    const response = await fetch(joinApiPath(apiConfig.baseUrl, path), {
      ...init,
      headers,
      signal: controller.signal,
    })
    return { response, payload: await readJson(response) }
  } catch (error) {
    if (init.signal?.aborted && !didTimeout) throw error
    throw networkError(didTimeout)
  } finally {
    window.clearTimeout(timeout)
    init.signal?.removeEventListener('abort', abortFromCaller)
  }
}

function accessTokenNeedsRefresh(): boolean {
  if (!tokenStorage.getRefreshToken()) return false
  if (!tokenStorage.getAccessToken()) return true

  const expiresAt = tokenStorage.getAccessExpiresAt()
  if (!expiresAt) return true
  const expiresAtMs = Date.parse(expiresAt)
  return Number.isNaN(expiresAtMs) || expiresAtMs - Date.now() <= REFRESH_LEEWAY_MS
}

function refreshTokenHasExpired(): boolean {
  const expiresAt = tokenStorage.getRefreshExpiresAt()
  if (!expiresAt) return false
  const expiresAtMs = Date.parse(expiresAt)
  return !Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now()
}

async function requestNewTokens(): Promise<void> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken || refreshTokenHasExpired()) throw new Error('Refresh token has expired')

  const { response, payload } = await send(
    AUTH_REFRESH_PATH,
    {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
    { includeAccessToken: false },
  )

  if (!response.ok) throw apiErrorFromResponse(response, payload)
  const envelope = parseSuccessEnvelope<AuthSession>(payload) as DataEnvelope<AuthSession>
  tokenStorage.setTokens(envelope.data)
}

async function refreshTokens(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = requestNewTokens().finally(() => {
      refreshPromise = undefined
    })
  }
  return refreshPromise
}

export async function refreshAccessToken(): Promise<void> {
  try {
    await refreshTokens()
  } catch (error) {
    console.error('[API] Token refresh failed', error)
    clearSessionAndRedirect()
    throw error
  }
}

export async function ensureFreshAccessToken(): Promise<void> {
  if (accessTokenNeedsRefresh()) await refreshAccessToken()
}

async function request<T>(
  path: string,
  init: RequestInit,
  { canRefresh = true, includeAccessToken = true }: RequestOptions = {},
): Promise<T> {
  if (includeAccessToken && canRefresh && path !== AUTH_REFRESH_PATH) {
    await ensureFreshAccessToken()
  }

  const { response, payload } = await send(path, init, { includeAccessToken })

  if (response.status === 401 && canRefresh && path !== AUTH_REFRESH_PATH) {
    await refreshAccessToken()
    return request<T>(path, init, { canRefresh: false, includeAccessToken })
  }

  if (!response.ok) {
    const error = apiErrorFromResponse(response, payload)
    console.error(`[API] ${init.method ?? 'GET'} ${path} failed`, {
      status: error.status,
      code: error.code,
      request_id: error.requestId,
    })
    throw error
  }

  return parseSuccessEnvelope(payload) as T
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init)
}

export async function publicApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, {
    canRefresh: false,
    includeAccessToken: path !== AUTH_LOGIN_PATH,
  })
}
