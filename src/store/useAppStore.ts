import { create } from 'zustand'
import type { CurrentUser } from '../api/types'

interface AppState {
  sidebarOpen: boolean
  currentUser: CurrentUser | null
  toggleSidebar: () => void
  closeSidebar: () => void
  setCurrentUser: (currentUser: CurrentUser) => void
  clearCurrentUser: () => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  currentUser: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  clearCurrentUser: () => set({ currentUser: null }),
}))
