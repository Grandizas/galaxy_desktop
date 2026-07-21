import { useCallback } from 'react'

import type { MenuItem } from '@/components/ui/ContextMenu'
import { getFileSystemService } from '@/services/filesystem'
import { writeClipboard } from '@/services/platform'
import { useFilesystemStore } from '@/store/filesystemStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useUiStore } from '@/store/uiStore'
import type { FsEntry } from '@/types'

/**
 * The actions available on an entry, shared by the context menu and the
 * inspector so the two can never drift apart.
 */
export function useEntryActions() {
  const navigateTo = useFilesystemStore((state) => state.navigateTo)
  const selected = useSelectionStore((state) => state.selected)
  const pushToast = useUiStore((state) => state.pushToast)
  const startRename = useUiStore((state) => state.startRename)
  const requestDeletion = useUiStore((state) => state.requestDeletion)

  const open = useCallback(
    async (entry: FsEntry) => {
      if (entry.isDirectory) {
        await navigateTo(entry.path)
        return
      }
      try {
        await getFileSystemService().openEntry(entry.path)
      } catch {
        pushToast(`Could not open "${entry.name}"`)
      }
    },
    [navigateTo, pushToast],
  )

  const copyPath = useCallback(
    async (entry: FsEntry) => {
      try {
        await writeClipboard(entry.path)
        pushToast('Path copied')
      } catch {
        pushToast('Could not copy the path')
      }
    },
    [pushToast],
  )

  const reveal = useCallback(
    async (entry: FsEntry) => {
      try {
        await getFileSystemService().revealEntry(entry.path)
      } catch {
        pushToast('Could not open Explorer')
      }
    },
    [pushToast],
  )

  /** Deletes the whole selection when the target is part of it. */
  const deletionTargets = useCallback(
    (entry: FsEntry) => (selected.has(entry.path) ? [...selected] : [entry.path]),
    [selected],
  )

  const buildMenu = useCallback(
    (entry: FsEntry): MenuItem[] => {
      const targets = deletionTargets(entry)
      const many = targets.length > 1

      return [
        {
          label: entry.isDirectory ? 'Enter system' : 'Open',
          onSelect: () => void open(entry),
        },
        { label: 'Rename', onSelect: () => startRename(entry.path), disabled: many },
        { label: 'Copy path', onSelect: () => void copyPath(entry), disabled: many },
        { label: 'Reveal in Explorer', onSelect: () => void reveal(entry) },
        {
          label: many ? `Delete ${targets.length} items` : 'Delete',
          danger: true,
          onSelect: () => requestDeletion(targets),
        },
      ]
    },
    [copyPath, deletionTargets, open, reveal, requestDeletion, startRename],
  )

  return { open, copyPath, reveal, buildMenu, deletionTargets }
}
