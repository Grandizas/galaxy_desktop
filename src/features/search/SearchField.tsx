import { SearchBar } from '@/components/ui/SearchBar'
import { useFilesystemStore } from '@/store/filesystemStore'
import { useSearchStore } from '@/store/searchStore'

import { useOpenResult } from './useOpenResult'

/**
 * Recursive search rooted at the current directory. Navigating away clears the
 * search (owned by `navigateTo`), so this is a "find here, then go" tool rather
 * than a query that follows you around.
 */
export function SearchField() {
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const query = useSearchStore((state) => state.query)
  const status = useSearchStore((state) => state.status)
  const results = useSearchStore((state) => state.results)
  const truncated = useSearchStore((state) => state.truncated)
  const runSearch = useSearchStore((state) => state.runSearch)
  const cycleMatch = useSearchStore((state) => state.cycleMatch)

  const openResult = useOpenResult()

  const hint = () => {
    if (!query.trim()) return null
    if (status === 'searching') return 'searching…'
    if (status === 'error') return 'error'
    return `${results.length}${truncated ? '+' : ''} found`
  }

  return (
    <SearchBar
      value={query}
      onValueChange={(value) => runSearch(currentPath ?? '', value)}
      hint={hint()}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          cycleMatch(1)
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          cycleMatch(-1)
        } else if (event.key === 'Enter') {
          const target = useSearchStore.getState().activeResult()
          if (target) void openResult(target)
        }
      }}
    />
  )
}
