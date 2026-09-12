import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '../services/api'
import { notifyQueryError } from './errorHandling'

const MAX_GET_RETRIES = 2

export function shouldRetryGet(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_GET_RETRIES) return false
  if (!(error instanceof ApiError)) return true
  return error.status === 0 || error.status === 429 || error.status >= 500
}

export function retryDelay(attemptIndex: number, error: unknown): number {
  if (error instanceof ApiError && error.retryAfterMs !== undefined) return error.retryAfterMs
  return Math.min(1_000 * 2 ** attemptIndex, 30_000)
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notifyQueryError }),
  mutationCache: new MutationCache({ onError: notifyQueryError }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: shouldRetryGet,
      retryDelay,
    },
    mutations: {
      retry: false,
    },
  },
})
