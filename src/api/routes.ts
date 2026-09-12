export const apiRoutes = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    setupSecondFactor: '/auth/2fa/setup',
    confirmSecondFactor: '/auth/2fa/confirm',
  },
  currentUser: '/auth/me',
  dashboard: '/dashboard/overview',
  calls: '/calls',
  matching: '/matching',
  leads: '/leads',
  analytics: '/analytics',
  finance: '/finance',
  notifications: '/alerts',
  settings: '/settings',
} as const
