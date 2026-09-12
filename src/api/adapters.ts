import type {
  BackendDataEnvelope,
  BackendListEnvelope,
  BackendPagination,
  DataEnvelope,
  ErrorBody,
  ErrorEnvelope,
  ListEnvelope,
  Money,
  PageParams,
  PaginationMeta,
  ResponseMeta,
} from './types'

type QueryPrimitive = string | number | boolean | Date | null | undefined
type QueryValue = QueryPrimitive | readonly QueryPrimitive[]

export interface FormQueryParams extends Partial<PageParams> {
  filters?: Record<string, QueryValue>
  [key: string]: QueryValue | Record<string, QueryValue> | undefined
}

function appendQueryValue(query: URLSearchParams, key: string, value: QueryValue): void {
  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryValue(query, key, item))
    return
  }

  if (value === null || value === undefined || value === '') return
  query.append(key, value instanceof Date ? value.toISOString() : String(value))
}

export function toApiQuery(params: FormQueryParams = {}): URLSearchParams {
  const query = new URLSearchParams()
  const { page, per_page: perPage, filters, ...rest } = params

  if (page !== undefined || perPage !== undefined) {
    const normalizedPage = Math.max(1, page ?? 1)
    const normalizedPerPage = Math.max(1, perPage ?? 50)
    query.set('limit', String(normalizedPerPage))
    query.set('offset', String((normalizedPage - 1) * normalizedPerPage))
  }

  Object.entries({ ...rest, ...filters }).forEach(([key, value]) => {
    appendQueryValue(query, key, value as QueryValue)
  })

  return query
}

export function withApiQuery(path: string, params?: FormQueryParams): string {
  const [pathname, existingQuery = ''] = path.split('?', 2)
  const query = new URLSearchParams(existingQuery)
  toApiQuery(params).forEach((value, key) => query.append(key, value))
  const queryString = query.toString()
  return queryString ? `${pathname}?${queryString}` : pathname
}

export function fromMinorUnits(amountMinor: number | string | bigint, currency: string): Money {
  const amount = BigInt(amountMinor)
  const sign = amount < 0n ? '-' : ''
  const absoluteAmount = amount < 0n ? -amount : amount
  const major = absoluteAmount / 100n
  const minor = String(absoluteAmount % 100n).padStart(2, '0')

  return { amount: `${sign}${major}.${minor}`, currency }
}

export function toMinorUnits(money: Money): number {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(money.amount)
  if (!match) throw new TypeError(`Invalid money amount: ${money.amount}`)

  const absoluteValue = BigInt(match[2]) * 100n + BigInt(match[3])
  const value = Number(match[1] === '-' ? -absoluteValue : absoluteValue)
  if (!Number.isSafeInteger(value))
    throw new RangeError(`Money amount is too large: ${money.amount}`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeMeta(meta: unknown): ResponseMeta {
  if (!isRecord(meta) || !Array.isArray(meta.hidden_fields)) return { hidden_fields: [] }
  return {
    hidden_fields: meta.hidden_fields.filter((field): field is string => typeof field === 'string'),
  }
}

function normalizePagination(
  pagination: BackendPagination | undefined,
  meta: unknown,
  itemCount: number,
): PaginationMeta {
  const rawMeta = isRecord(meta) ? meta : {}
  const perPage = pagination?.limit ?? asPositiveInteger(rawMeta.per_page) ?? Math.max(1, itemCount)
  const offset = pagination?.offset ?? ((asPositiveInteger(rawMeta.page) ?? 1) - 1) * perPage
  const page = Math.floor(offset / perPage) + 1
  const total = pagination?.total ?? asNonNegativeInteger(rawMeta.total)
  const from = itemCount === 0 ? 0 : offset + 1
  const to = itemCount === 0 ? 0 : offset + itemCount

  return { ...normalizeMeta(meta), page, per_page: perPage, total, from, to }
}

function asPositiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

function asNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
}

export function parseSuccessEnvelope<T>(payload: unknown): DataEnvelope<T> | ListEnvelope<T> {
  if (!isRecord(payload) || !('data' in payload)) {
    throw new TypeError('API response does not contain a data envelope')
  }

  if (Array.isArray(payload.data)) {
    const envelope = payload as unknown as BackendListEnvelope<T>
    return {
      data: envelope.data,
      meta: normalizePagination(envelope.pagination, envelope.meta, envelope.data.length),
    }
  }

  const envelope = payload as unknown as BackendDataEnvelope<T>
  return { data: envelope.data, meta: normalizeMeta(envelope.meta) }
}

export function parseErrorEnvelope(payload: unknown, fallbackRequestId = ''): ErrorEnvelope {
  const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {}
  const fieldErrors = isRecord(error.field_errors)
    ? Object.fromEntries(
        Object.entries(error.field_errors).map(([field, messages]) => [
          field,
          Array.isArray(messages)
            ? messages.filter((message): message is string => typeof message === 'string')
            : [],
        ]),
      )
    : {}

  const normalizedError: ErrorBody = {
    code: typeof error.code === 'string' ? error.code : 'HTTP_ERROR',
    message: typeof error.message === 'string' ? error.message : 'Не удалось выполнить запрос',
    field_errors: fieldErrors,
    request_id:
      typeof error.request_id === 'string' && error.request_id
        ? error.request_id
        : fallbackRequestId,
  }

  return { error: normalizedError }
}
