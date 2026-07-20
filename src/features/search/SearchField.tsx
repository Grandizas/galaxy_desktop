import { SearchBar } from '@/components/ui/SearchBar'
import { useSelectionStore } from '@/store/selectionStore'
import { useSearchStore } from '@/store/searchStore'

import { useSearchMatches } from './useSearchMatches'

/** Search input wired to the search store; results highlight in the galaxy. */
export function SearchField() {
  const query = useSearchStore((state) => state.query)
  const setQuery = useSearchStore((state) => state.setQuery)
  const cycleMatch = useSearchStore((state) => state.cycleMatch)
  const activeMatchIndex = useSearchStore((state) => state.activeMatchIndex)
  const select = useSelectionStore((state) => state.select)

  const matches = useSearchMatches()

  return (
    <SearchBar
      value={query}
      onValueChange={setQuery}
      hint={query.trim() ? `${matches.length} found` : null}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || matches.length === 0) return
        const path = matches[activeMatchIndex % matches.length]
        if (path) select(path)
        cycleMatch(1)
      }}
    />
  )
}
