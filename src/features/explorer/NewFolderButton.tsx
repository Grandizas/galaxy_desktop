import { useState } from 'react'

import { useFilesystemStore } from '@/store/filesystemStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useUiStore } from '@/store/uiStore'

/** Creates a folder and drops straight into renaming it, as Explorer does. */
export function NewFolderButton() {
  const [busy, setBusy] = useState(false)
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const createFolder = useFilesystemStore((state) => state.createFolder)
  const select = useSelectionStore((state) => state.select)
  const startRename = useUiStore((state) => state.startRename)
  const pushToast = useUiStore((state) => state.pushToast)

  const create = async () => {
    // Two fast clicks would compute the same name from the unchanged listing
    // and race; the loser fails with a misleading "already exists" toast.
    if (busy) return
    setBusy(true)

    try {
      const created = await createFolder(nextUntitledName())
      if (!created) {
        pushToast(useFilesystemStore.getState().error ?? 'Could not create the folder')
        return
      }
      select(created.path)
      startRename(created.path)
    } finally {
      setBusy(false)
    }
  }

  /** Avoids colliding with folders already named "New World". */
  const nextUntitledName = () => {
    const taken = new Set(useFilesystemStore.getState().entries.map((entry) => entry.name))
    if (!taken.has('New World')) return 'New World'

    let n = 2
    while (taken.has(`New World ${n}`)) n++
    return `New World ${n}`
  }

  return (
    <button
      type="button"
      disabled={!currentPath || busy}
      onClick={() => void create()}
      className="flex items-center gap-2 rounded-full glass px-4 py-2.5 text-[12.5px] tracking-[0.06em] transition-all duration-200 no-drag hover:border-accent/50 hover:shadow-[0_0_22px_rgba(103,232,249,0.18)] disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="text-[15px] leading-none text-accent">+</span>
      New folder
    </button>
  )
}
