import { create } from 'zustand'

import { getFileSystemService } from '@/services/filesystem'
import type { FsEntry } from '@/types'

type SearchStatus = 'idle' | 'searching' | 'ready' | 'error'

interface SearchState {
  query: string
  /** Directory the current search is rooted at. */
  root: string | null
  /** Recursive results across the subtree. */
  results: readonly FsEntry[]
  /** A backend limit stopped the walk early. */
  truncated: boolean
  status: SearchStatus
  error: string | null
  /** Index into `results` for keyboard cycling / fly-to. */
  activeIndex: number
}

interface SearchActions {
  /** Kicks off a debounced recursive search rooted at `root`. */
  runSearch: (root: string, query: string) => void
  cycleMatch: (direction?: 1 | -1) => void
  /** The result the arrow keys / Enter currently point at. */
  activeResult: () => FsEntry | null
  reset: () => void
}

const DEBOUNCE_MS = 220

let debounceHandle: ReturnType<typeof setTimeout> | null = null
/** Monotonic id so a slow search cannot overwrite a newer one's results. */
let requestSeq = 0

export const useSearchStore = create<SearchState & SearchActions>((set, get) => ({
  query: '',
  root: null,
  results: [],
  truncated: false,
  status: 'idle',
  error: null,
  activeIndex: 0,

  runSearch: (root, query) => {
    set({ query, root, activeIndex: 0 })

    if (debounceHandle) clearTimeout(debounceHandle)

    const trimmed = query.trim()
    if (!trimmed) {
      set({ results: [], truncated: false, status: 'idle', error: null })
      return
    }

    set({ status: 'searching' })
    const seq = ++requestSeq

    debounceHandle = setTimeout(() => {
      void getFileSystemService()
        .searchDirectory(root, trimmed)
        .then((result) => {
          // A newer keystroke has superseded this search — drop it.
          if (seq !== requestSeq) return
          set({
            results: result.entries,
            truncated: result.truncated,
            status: 'ready',
            error: null,
            activeIndex: 0,
          })
        })
        .catch((error: unknown) => {
          if (seq !== requestSeq) return
          set({
            results: [],
            truncated: false,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          })
        })
    }, DEBOUNCE_MS)
  },

  cycleMatch: (direction = 1) => {
    const { results, activeIndex } = get()
    if (results.length === 0) return
    set({ activeIndex: (activeIndex + direction + results.length) % results.length })
  },

  activeResult: () => {
    const { results, activeIndex } = get()
    return results[activeIndex] ?? null
  },

  reset: () => {
    if (debounceHandle) clearTimeout(debounceHandle)
    // Invalidate any in-flight search so its late result cannot land after reset.
    requestSeq++
    set({
      query: '',
      root: null,
      results: [],
      truncated: false,
      status: 'idle',
      error: null,
      activeIndex: 0,
    })
  },
}))
