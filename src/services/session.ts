import { tokenStorage } from './tokenStorage'

export const LOGIN_PATH = '/login'

export function clearSessionAndRedirect(): void {
  tokenStorage.clear()
  if (window.location.pathname !== LOGIN_PATH) window.location.replace(LOGIN_PATH)
}
