type ApiErrorNotifier = (message: string) => void

let apiErrorNotifier: ApiErrorNotifier | undefined

export function setApiErrorNotifier(notifier: ApiErrorNotifier): () => void {
  apiErrorNotifier = notifier
  return () => {
    if (apiErrorNotifier === notifier) apiErrorNotifier = undefined
  }
}

export function notifyApiError(message: string): void {
  apiErrorNotifier?.(message)
}
