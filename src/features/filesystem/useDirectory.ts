import { useEffect } from 'react'

import { useFilesystemStore } from '@/store/filesystemStore'

/**
 * Boots the filesystem store once.
 *
 * Clearing selection and search on navigation is owned by `navigateTo` itself,
 * so a result opened from search can select its target deterministically —
 * doing it here in an effect would race that select.
 */
export function useDirectory() {
  const status = useFilesystemStore((state) => state.status)
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const initialize = useFilesystemStore((state) => state.initialize)

  useEffect(() => {
    if (status === 'idle') void initialize()
  }, [status, initialize])

  return { status, currentPath }
}
