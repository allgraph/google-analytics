import { create } from 'zustand'

interface AppState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
}))
