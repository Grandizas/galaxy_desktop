import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ContextMenu } from '@/components/ui/ContextMenu'
import { useFilesystemStore } from '@/store/filesystemStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useUiStore } from '@/store/uiStore'
import { basename } from '@/utils/path'

import { useEntryActions } from './useEntryActions'

/**
 * DOM chrome for file operations: the context menu and the delete
 * confirmation. Kept out of the 3D tree so it is plain, accessible HTML.
 */
export function ExplorerOverlays() {
  const entries = useFilesystemStore((state) => state.entries)
  const deleteEntries = useFilesystemStore((state) => state.deleteEntries)

  const contextMenu = useUiStore((state) => state.contextMenu)
  const closeContextMenu = useUiStore((state) => state.closeContextMenu)
  const pendingDeletion = useUiStore((state) => state.pendingDeletion)
  const requestDeletion = useUiStore((state) => state.requestDeletion)
  const pushToast = useUiStore((state) => state.pushToast)
  const clearSelection = useSelectionStore((state) => state.clear)

  const { buildMenu } = useEntryActions()

  const target = contextMenu && entries.find((entry) => entry.path === contextMenu.path)
  const doomed = pendingDeletion ?? []

  const confirmDeletion = async () => {
    const paths = [...doomed]
    requestDeletion(null)

    if (await deleteEntries(paths)) {
      clearSelection()
      pushToast(
        paths.length === 1
          ? `"${basename(paths[0]!)}" moved to the Recycle Bin`
          : `${paths.length} items moved to the Recycle Bin`,
      )
    } else {
      pushToast(useFilesystemStore.getState().error ?? 'Could not delete')
    }
  }

  return (
    <>
      {contextMenu && target && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildMenu(target)}
          onClose={closeContextMenu}
        />
      )}

      <ConfirmDialog
        open={doomed.length > 0}
        title={doomed.length === 1 ? 'Delete this world?' : `Delete ${doomed.length} worlds?`}
        description={
          doomed.length === 1
            ? `"${basename(doomed[0] ?? '')}" will be moved to the Recycle Bin. You can restore it from there.`
            : `${doomed.length} items will be moved to the Recycle Bin. You can restore them from there.`
        }
        confirmLabel="Move to Recycle Bin"
        danger
        onConfirm={() => void confirmDeletion()}
        onCancel={() => requestDeletion(null)}
      />
    </>
  )
}
