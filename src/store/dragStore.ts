import { create } from 'zustand'

import type { FsEntry } from '@/types'

interface DragState {
  /** The entry being dragged, or null when no drag is in progress. */
  dragging: FsEntry | null
  /** Path of the folder-planet currently under the pointer, if it is a valid drop. */
  dropTarget: string | null
}

interface DragActions {
  begin: (entry: FsEntry) => void
  setDropTarget: (path: string | null) => void
  end: () => void
}

export const useDragStore = create<DragState & DragActions>((set) => ({
  dragging: null,
  dropTarget: null,

  begin: (dragging) => set({ dragging, dropTarget: null }),
  setDropTarget: (dropTarget) => set({ dropTarget }),
  end: () => set({ dragging: null, dropTarget: null }),
}))
