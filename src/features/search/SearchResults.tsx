import { AnimatePresence, motion } from 'framer-motion'

import { Panel } from '@/components/ui/Panel'
import { ENTRY_KIND_LABEL } from '@/lib/classify'
import { useSearchStore } from '@/store/searchStore'
import { cn } from '@/utils/cn'
import { formatBytes } from '@/utils/format'
import { dirname } from '@/utils/path'

import { useOpenResult } from './useOpenResult'

/**
 * Recursive search results, listed below the search bar.
 *
 * A match can live far below the open system, where an in-scene glow could not
 * reach it — so results are a plain, navigable list. Selecting one flies the
 * galaxy to it via `useOpenResult`.
 */
export function SearchResults() {
  const query = useSearchStore((state) => state.query)
  const status = useSearchStore((state) => state.status)
  const results = useSearchStore((state) => state.results)
  const truncated = useSearchStore((state) => state.truncated)
  const error = useSearchStore((state) => state.error)
  const activeIndex = useSearchStore((state) => state.activeIndex)

  const openResult = useOpenResult()
  const open = query.trim().length > 0 && status !== 'idle'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto w-[440px]"
        >
          <Panel className="max-h-[min(52vh,520px)]" padded={false}>
            {status === 'error' ? (
              <p className="px-4 py-6 text-center text-[13px] text-danger">{error}</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-content-muted">
                {status === 'searching' ? 'Scanning the subtree…' : 'No worlds match that name'}
              </p>
            ) : (
              <ul className="flex flex-col py-1.5">
                {results.map((entry, index) => (
                  <li key={entry.path}>
                    <button
                      type="button"
                      onClick={() => void openResult(entry)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
                        'hover:bg-white/8',
                        index === activeIndex && 'bg-primary/12',
                      )}
                    >
                      <span
                        className={cn(
                          'size-2 shrink-0 rounded-full',
                          entry.isDirectory ? 'bg-primary-soft' : 'bg-accent',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-content">
                          {entry.name}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-content-subtle">
                          {dirname(entry.path) ?? entry.path}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-content-muted">
                        {entry.isDirectory ? 'Folder' : ENTRY_KIND_LABEL[entry.kind]}
                        {!entry.isDirectory &&
                          entry.size != null &&
                          ` · ${formatBytes(entry.size)}`}
                      </span>
                    </button>
                  </li>
                ))}

                {truncated && (
                  <li className="px-4 pt-2 pb-1 text-center font-mono text-[10px] text-warning">
                    showing the first {results.length} — narrow the search to see more
                  </li>
                )}
              </ul>
            )}
          </Panel>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
