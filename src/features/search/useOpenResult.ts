import { useCallback } from 'react'

import { useFilesystemStore } from '@/store/filesystemStore'
import { useSearchStore } from '@/store/searchStore'
import { useSelectionStore } from '@/store/selectionStore'
import type { FsEntry } from '@/types'
import { dirname } from '@/utils/path'

/**
 * Reveals a search result in the galaxy.
 *
 * A result may live many folders below the current view, so revealing it means
 * navigating to its parent directory and selecting it there. A folder result
 * navigates *into itself*; a file navigates to its parent and selects the file.
 */
export function useOpenResult() {
  const navigateTo = useFilesystemStore((state) => state.navigateTo)
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const select = useSelectionStore((state) => state.select)
  const resetSearch = useSearchStore((state) => state.reset)

  return useCallback(
    async (entry: FsEntry) => {
      const targetDir = entry.isDirectory ? entry.path : dirname(entry.path)
      if (!targetDir) return

      if (targetDir !== currentPath) {
        const ok = await navigateTo(targetDir)
        if (!ok) return
      } else {
        // Already in the target folder, so navigateTo is skipped — but picking
        // a result must still close the results panel, which navigateTo would
        // otherwise have done via its own search reset.
        resetSearch()
      }
      // Selecting the file (not the folder we entered) puts the inspector on it.
      if (!entry.isDirectory) select(entry.path)
    },
    [navigateTo, currentPath, select, resetSearch],
  )
}
