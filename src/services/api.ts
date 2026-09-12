import { parseErrorEnvelope, parseSuccessEnvelope } from '../api/adapters'
import type { ErrorBody } from '../api/types'
import { notifyApiError } from './apiFeedback'
import { tokenStorage } from './tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

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

  constructor(status: number, error: ErrorBody) {
    super(error.message)
    this.name = 'ApiError'
    this.status = status
    this.code = error.code
    this.fieldErrors = error.field_errors
    this.requestId = error.request_id
  }
}

function joinApiPath(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return { data: undefined }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return undefined

  return response.json()
}

function errorToastText(error: ErrorBody): string {
  return error.request_id ? `${error.message} (request_id: ${error.request_id})` : error.message
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  let didTimeout = false
  const timeout = window.setTimeout(() => {
    didTimeout = true
    controller.abort('timeout')
  }, apiConfig.timeout)
  const abortFromCaller = () => controller.abort(init?.signal?.reason)
  if (init?.signal?.aborted) abortFromCaller()
  else init?.signal?.addEventListener('abort', abortFromCaller, { once: true })

  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const accessToken = tokenStorage.getAccessToken()
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  try {
    const response = await fetch(joinApiPath(apiConfig.baseUrl, path), {
      ...init,
      headers,
      signal: controller.signal,
    })
    const payload = await readJson(response)

    if (!response.ok) {
      const fallbackRequestId = response.headers.get('x-request-id') ?? ''
      const { error } = parseErrorEnvelope(payload, fallbackRequestId)
      console.error(`[API] ${init?.method ?? 'GET'} ${path} failed`, {
        status: response.status,
        code: error.code,
        request_id: error.request_id,
      })
      notifyApiError(errorToastText(error))
      throw new ApiError(response.status, error)
    }

    return parseSuccessEnvelope(payload) as T
  } catch (error) {
    if (error instanceof ApiError) throw error

    const message = didTimeout
      ? 'Превышено время ожидания ответа сервера'
      : 'Не удалось связаться с сервером'
    console.error(`[API] ${init?.method ?? 'GET'} ${path} failed`, error)
    notifyApiError(message)
    throw error
  } finally {
    window.clearTimeout(timeout)
    init?.signal?.removeEventListener('abort', abortFromCaller)
  }
}
