import type { FormInstance } from 'antd'
import { ApiError } from '../services/api'
import { notifyApiError } from '../services/apiFeedback'

export interface FormFieldError {
  name: string
  errors: string[]
}

export function isForbiddenError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 403
}

export function apiErrorToFormFields(error: unknown): FormFieldError[] {
  if (!(error instanceof ApiError) || error.status !== 422) return []
  return Object.entries(error.fieldErrors).map(([name, errors]) => ({ name, errors }))
}

export function applyApiErrorToForm(error: unknown, form: FormInstance): boolean {
  const fields = apiErrorToFormFields(error)
  if (fields.length === 0) return false
  form.setFields(fields)
  return true
}

export function notifyQueryError(error: unknown): void {
  if (error instanceof DOMException && error.name === 'AbortError') return
  if (isForbiddenError(error)) return
  if (!(error instanceof ApiError)) {
    notifyApiError('Не удалось выполнить запрос')
    return
  }

  if (error.status === 401) return
  const requestId = error.requestId ? ` (request_id: ${error.requestId})` : ''
  notifyApiError(`${error.message}${requestId}`)
}
