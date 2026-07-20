import { useEffect } from 'react'

import { useFilesystemStore } from '@/store/filesystemStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useSearchStore } from '@/store/searchStore'

/**
 * Boots the filesystem store once and keeps transient UI state (selection,
 * search) in sync with the directory currently on screen.
 */
export function useDirectory() {
  const status = useFilesystemStore((state) => state.status)
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const initialize = useFilesystemStore((state) => state.initialize)
  const clearSelection = useSelectionStore((state) => state.clear)
  const resetSearch = useSearchStore((state) => state.reset)

  useEffect(() => {
    if (status === 'idle') void initialize()
  }, [status, initialize])

  useEffect(() => {
    clearSelection()
    resetSearch()
  }, [currentPath, clearSelection, resetSearch])

  return { status, currentPath }
}
