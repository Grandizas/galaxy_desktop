import { useEffect, useMemo } from 'react'

import { useFilesystemStore } from '@/store/filesystemStore'
import { useSearchStore } from '@/store/searchStore'

/**
 * Filters the current listing by name and publishes the matches to the store,
 * where the galaxy picks them up to dim everything else.
 *
 * Scoped to the open directory for now; recursive indexing lands with the
 * search feature proper.
 */
export function useSearchMatches() {
  const entries = useFilesystemStore((state) => state.entries)
  const query = useSearchStore((state) => state.query)
  const setMatches = useSearchStore((state) => state.setMatches)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return entries.filter((e) => e.name.toLowerCase().includes(needle)).map((e) => e.path)
  }, [entries, query])

  useEffect(() => setMatches(matches), [matches, setMatches])

  return matches
}
