import { create } from 'zustand'

interface SearchState {
  query: string
  /** Paths matching the current query — filled in by the search feature. */
  matches: readonly string[]
  activeMatchIndex: number
}

interface SearchActions {
  setQuery: (query: string) => void
  setMatches: (matches: readonly string[]) => void
  cycleMatch: (direction?: 1 | -1) => void
  reset: () => void
}

export const useSearchStore = create<SearchState & SearchActions>((set, get) => ({
  query: '',
  matches: [],
  activeMatchIndex: 0,

  setQuery: (query) => set({ query, activeMatchIndex: 0 }),
  setMatches: (matches) => set({ matches }),
  cycleMatch: (direction = 1) => {
    const { matches, activeMatchIndex } = get()
    if (matches.length === 0) return
    set({ activeMatchIndex: (activeMatchIndex + direction + matches.length) % matches.length })
  },
  reset: () => set({ query: '', matches: [], activeMatchIndex: 0 }),
}))
