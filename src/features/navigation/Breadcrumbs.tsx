import { useFilesystemStore } from '@/store/filesystemStore'
import { cn } from '@/utils/cn'
import { pathSegments } from '@/utils/path'

/** Path trail rendered as a chain of stars. */
export function Breadcrumbs() {
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const navigateTo = useFilesystemStore((state) => state.navigateTo)

  const segments = pathSegments(currentPath ?? '')
  if (segments.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        return (
          <div key={segment.path} className="flex items-center">
            {index > 0 && (
              <span className="h-px w-6 bg-gradient-to-r from-primary-soft/5 to-primary-soft/50" />
            )}
            <button
              type="button"
              onClick={() => void navigateTo(segment.path)}
              className="flex items-center gap-2 rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/7"
            >
              <span
                className={cn(
                  'rounded-full',
                  isLast
                    ? 'size-2 bg-warning shadow-[0_0_8px_currentColor]'
                    : 'size-1.5 bg-primary-soft/75',
                )}
              />
              <span
                className={cn(
                  'text-xs tracking-[0.05em]',
                  isLast ? 'text-content' : 'text-content-muted',
                )}
              >
                {segment.label}
              </span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
