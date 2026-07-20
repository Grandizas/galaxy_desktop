import { useFilesystemStore } from '@/store/filesystemStore'
import { basename } from '@/utils/path'
import { formatCount } from '@/utils/format'

/**
 * The default view. The galaxy itself is rendered by the shell, so this page
 * only contributes the caption anchored under the central star.
 */
export function GalaxyPage() {
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const entries = useFilesystemStore((state) => state.entries)

  if (!currentPath) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 text-center">
      <h1 className="text-[15px] font-medium tracking-[0.14em] uppercase">
        {basename(currentPath)}
      </h1>
      <p className="mt-1 font-mono text-[10px] text-content-muted">
        {formatCount(entries.length, 'object')} in this system
      </p>
      <p className="mt-3 font-mono text-[10px] text-content-subtle">
        drag to orbit · scroll to zoom · double-click a world to enter
      </p>
    </div>
  )
}
