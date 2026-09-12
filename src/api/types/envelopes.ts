export interface ResponseMeta {
  hidden_fields: string[]
}

export interface PageParams {
  page: number
  per_page: number
}

export interface PaginationMeta extends PageParams, ResponseMeta {
  total?: number
  from: number
  to: number
}

export interface DataEnvelope<T> {
  data: T
  meta: ResponseMeta
}

export interface ListEnvelope<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ErrorBody {
  code: string
  message: string
  field_errors: Record<string, string[]>
  request_id: string
}

export interface ErrorEnvelope {
  error: ErrorBody
}

export interface BackendPagination {
  limit: number
  offset: number
  total?: number
}

export interface BackendDataEnvelope<T> {
  data: T
  meta?: Partial<ResponseMeta>
}

export interface BackendListEnvelope<T> {
  data: T[]
  pagination?: BackendPagination
  meta?: Partial<PaginationMeta>
}
