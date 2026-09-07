const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const apiConfig = {
  baseUrl: API_BASE_URL,
  mode: import.meta.env.VITE_API_MODE,
  timeout: 15_000,
} as const

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), apiConfig.timeout)

  try {
    const response = await fetch(`${apiConfig.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`API request failed: ${response.status}`)
    return (await response.json()) as T
  } finally {
    window.clearTimeout(timeout)
  }
}
