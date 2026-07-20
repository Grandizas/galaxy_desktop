import { useFilesystemStore } from '@/store/filesystemStore'
import { useSelectionStore, selectPrimarySelection } from '@/store/selectionStore'
import type { FsEntry } from '@/types'

/**
 * The entry the inspector describes: the hovered body if any, otherwise the
 * primary selection. Returns null when nothing is targeted.
 */
export function useInspectedEntry(): FsEntry | null {
  const entries = useFilesystemStore((state) => state.entries)
  const hovered = useSelectionStore((state) => state.hovered)
  const primary = useSelectionStore(selectPrimarySelection)

  const path = primary ?? hovered
  if (!path) return null
  return entries.find((entry) => entry.path === path) ?? null
}
