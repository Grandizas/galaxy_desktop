import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setFileSystemService, type FileSystemService } from '@/services/filesystem'
import { useSearchStore } from '@/store/searchStore'
import type { FsEntry, SearchResult } from '@/types'

const entry = (name: string): FsEntry => ({
  path: `C:\\Users\\Nova\\${name}`,
  name,
  kind: 'doc',
  isDirectory: false,
  size: 1,
  modifiedAt: 1,
  createdAt: null,
})

/** A service whose search resolves only when the test says so. */
function deferredService() {
  const calls: Array<{ query: string; resolve: (r: SearchResult) => void }> = []
  const service = {
    id: 'mock',
    searchDirectory: (_root: string, query: string) =>
      new Promise<SearchResult>((resolve) => calls.push({ query, resolve })),
  } as unknown as FileSystemService
  return { service, calls }
}

const reset = () => useSearchStore.getState().reset()

describe('searchStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    reset()
  })
  afterEach(() => vi.useRealTimers())

  it('debounces: a burst of keystrokes issues one search', async () => {
    const { service, calls } = deferredService()
    setFileSystemService(service)

    useSearchStore.getState().runSearch('C:\\X', 'r')
    useSearchStore.getState().runSearch('C:\\X', 're')
    useSearchStore.getState().runSearch('C:\\X', 'rep')

    expect(calls).toHaveLength(0) // still within the debounce window
    await vi.advanceTimersByTimeAsync(300)

    expect(calls).toHaveLength(1)
    expect(calls[0]!.query).toBe('rep')
  })

  it('drops a stale result when a newer search has superseded it', async () => {
    const { service, calls } = deferredService()
    setFileSystemService(service)

    useSearchStore.getState().runSearch('C:\\X', 'old')
    await vi.advanceTimersByTimeAsync(300)
    useSearchStore.getState().runSearch('C:\\X', 'new')
    await vi.advanceTimersByTimeAsync(300)
    expect(calls).toHaveLength(2)

    // The newer search resolves first, then the stale one resolves late.
    calls[1]!.resolve({ entries: [entry('new-hit')], truncated: false, examined: 1 })
    calls[0]!.resolve({ entries: [entry('old-hit')], truncated: false, examined: 1 })
    await vi.runAllTimersAsync()

    expect(useSearchStore.getState().results.map((e) => e.name)).toEqual(['new-hit'])
  })

  it('an empty query clears results without hitting the backend', async () => {
    const { service, calls } = deferredService()
    setFileSystemService(service)

    useSearchStore.getState().runSearch('C:\\X', 'x')
    await vi.advanceTimersByTimeAsync(300)
    calls[0]!.resolve({ entries: [entry('hit')], truncated: false, examined: 1 })
    await vi.runAllTimersAsync()
    expect(useSearchStore.getState().results).toHaveLength(1)

    useSearchStore.getState().runSearch('C:\\X', '   ')
    await vi.advanceTimersByTimeAsync(300)

    expect(useSearchStore.getState().results).toHaveLength(0)
    expect(useSearchStore.getState().status).toBe('idle')
    expect(calls).toHaveLength(1) // no second backend call
  })

  it('reset invalidates an in-flight search so its late result never lands', async () => {
    const { service, calls } = deferredService()
    setFileSystemService(service)

    useSearchStore.getState().runSearch('C:\\X', 'x')
    await vi.advanceTimersByTimeAsync(300)
    reset()

    // The search the user abandoned resolves after the reset.
    calls[0]!.resolve({ entries: [entry('late')], truncated: false, examined: 1 })
    await vi.runAllTimersAsync()

    expect(useSearchStore.getState().results).toHaveLength(0)
    expect(useSearchStore.getState().query).toBe('')
  })

  it('cycles the active index within bounds', () => {
    useSearchStore.setState({ results: [entry('a'), entry('b'), entry('c')], activeIndex: 0 })

    useSearchStore.getState().cycleMatch(1)
    expect(useSearchStore.getState().activeIndex).toBe(1)

    useSearchStore.getState().cycleMatch(-1)
    useSearchStore.getState().cycleMatch(-1)
    expect(useSearchStore.getState().activeIndex).toBe(2) // wrapped past zero
  })
})
