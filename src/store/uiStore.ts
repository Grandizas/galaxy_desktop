import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
}

interface UiState {
  sidebarOpen: boolean
  inspectorOpen: boolean
  searchOpen: boolean
  reducedMotion: boolean
  toasts: Toast[]
}

interface UiActions {
  toggleSidebar: (open?: boolean) => void
  toggleInspector: (open?: boolean) => void
  toggleSearch: (open?: boolean) => void
  setReducedMotion: (value: boolean) => void
  pushToast: (message: string) => void
  dismissToast: (id: number) => void
}

let toastId = 0

export const useUiStore = create<UiState & UiActions>((set) => ({
  sidebarOpen: true,
  inspectorOpen: true,
  searchOpen: false,
  reducedMotion: false,
  toasts: [],

  toggleSidebar: (open) => set((state) => ({ sidebarOpen: open ?? !state.sidebarOpen })),
  toggleInspector: (open) => set((state) => ({ inspectorOpen: open ?? !state.inspectorOpen })),
  toggleSearch: (open) => set((state) => ({ searchOpen: open ?? !state.searchOpen })),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),

  pushToast: (message) => {
    const id = ++toastId
    set((state) => ({ toasts: [...state.toasts, { id, message }] }))
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), 2600)
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
