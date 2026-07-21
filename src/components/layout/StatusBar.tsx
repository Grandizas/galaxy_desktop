import { GALAXY } from '@/lib/constants'
import { getFileSystemService } from '@/services/filesystem'
import { useFilesystemStore, selectFileCount, selectFolderCount } from '@/store/filesystemStore'
import { useSelectionStore } from '@/store/selectionStore'
import { formatCount } from '@/utils/format'

/** Bottom strip: where you are, what is selected, and which provider is live. */
export function StatusBar() {
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const status = useFilesystemStore((state) => state.status)
  const error = useFilesystemStore((state) => state.error)
  const folderCount = useFilesystemStore(selectFolderCount)
  const fileCount = useFilesystemStore(selectFileCount)
  const selectedCount = useSelectionStore((state) => state.selected.size)

  // Mirrors the render budget applied in mapEntriesToGalaxy.
  const hiddenCount =
    Math.max(0, folderCount - GALAXY.maxPlanets) + Math.max(0, fileCount - GALAXY.maxMoons)

  return (
    <footer className="z-30 flex h-statusbar shrink-0 items-center justify-between gap-4 border-t border-border/60 bg-surface/40 px-4 font-mono text-[10px] text-content-subtle backdrop-blur-xl">
      <span className="truncate">{currentPath ?? 'No system loaded'}</span>

      <span className="flex shrink-0 items-center gap-4">
        {status === 'loading' && <span className="text-primary-soft">Scanning…</span>}
        {status === 'error' && <span className="text-danger">{error}</span>}
        <span>{formatCount(folderCount, 'planet')}</span>
        <span>{formatCount(fileCount, 'moon')}</span>
        {hiddenCount > 0 && (
          <span className="text-warning" title="Too many entries to render — see the roadmap">
            {hiddenCount.toLocaleString()} not shown
          </span>
        )}
        {selectedCount > 0 && <span className="text-accent">{selectedCount} selected</span>}
        <span className="text-content-subtle/70">fs: {getFileSystemService().id}</span>
      </span>
    </footer>
  )
}
