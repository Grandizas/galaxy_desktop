import { useEffect, useRef, useState } from 'react'

import { useFilesystemStore } from '@/store/filesystemStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useUiStore } from '@/store/uiStore'
import type { FsEntry } from '@/types'

/**
 * Inline rename. Commits on Enter or blur, abandons on Escape.
 *
 * Validation lives in the Rust layer — this only avoids pointless round trips
 * for an unchanged or empty name.
 */
export function RenameField({ entry }: { entry: FsEntry }) {
  const [draft, setDraft] = useState(entry.name)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const committed = useRef(false)

  const renameEntry = useFilesystemStore((state) => state.renameEntry)
  const startRename = useUiStore((state) => state.startRename)
  const pushToast = useUiStore((state) => state.pushToast)
  const select = useSelectionStore((state) => state.select)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    // Preselect the stem so typing replaces the name but keeps the extension.
    const dot = entry.isDirectory ? -1 : entry.name.lastIndexOf('.')
    input.setSelectionRange(0, dot > 0 ? dot : entry.name.length)
  }, [entry])

  const commit = async () => {
    if (committed.current) return
    committed.current = true

    const name = draft.trim()
    if (!name || name === entry.name) {
      startRename(null)
      return
    }

    setBusy(true)
    const renamed = await renameEntry(entry.path, name)
    setBusy(false)
    startRename(null)

    if (renamed) {
      select(renamed.path)
      pushToast(`Renamed to "${renamed.name}"`)
    } else {
      pushToast(useFilesystemStore.getState().error ?? 'Could not rename')
    }
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      disabled={busy}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') void commit()
        if (event.key === 'Escape') {
          committed.current = true
          startRename(null)
        }
        event.stopPropagation()
      }}
      className="w-full rounded-lg border border-accent/50 bg-white/6 px-2.5 py-1.5 text-center text-[15px] font-medium text-content outline-none disabled:opacity-50"
      aria-label="New name"
    />
  )
}
