import { describe, expect, it } from 'vitest'

import type { FsEntry } from '@/types'

import { byRecency, mergeChildCounts } from './entries'

const entry = (name: string, modifiedAt: number | null, childCount?: number): FsEntry => ({
  path: `C:\\Users\\Nova\\${name}`,
  name,
  kind: 'folder',
  isDirectory: true,
  size: null,
  modifiedAt,
  createdAt: null,
  ...(childCount === undefined ? {} : { childCount }),
})

describe('byRecency', () => {
  it('orders newest first', () => {
    const result = byRecency([entry('a', 1), entry('b', 3), entry('c', 2)])
    expect(result.map((e) => e.name)).toEqual(['b', 'c', 'a'])
  })

  it('sorts undated entries last, alphabetically', () => {
    const result = byRecency([entry('z', null), entry('a', null), entry('recent', 5)])
    expect(result.map((e) => e.name)).toEqual(['recent', 'a', 'z'])
  })

  it('applies the limit after sorting, not before', () => {
    // Alphabetically 'aaa' comes first, but it is the oldest — slicing an
    // unsorted array would keep the wrong entries.
    const result = byRecency([entry('aaa', 1), entry('zzz', 9), entry('mmm', 5)], 2)
    expect(result.map((e) => e.name)).toEqual(['zzz', 'mmm'])
  })

  it('does not mutate its input', () => {
    const input = [entry('a', 1), entry('b', 3)]
    byRecency(input)
    expect(input.map((e) => e.name)).toEqual(['a', 'b'])
  })
})

describe('mergeChildCounts', () => {
  it('carries known counts onto a fresh listing', () => {
    const fresh = [entry('Projects', 1), entry('Pictures', 2)]
    const previous = [entry('Projects', 1, 7)]

    const merged = mergeChildCounts(fresh, previous)

    expect(merged[0]!.childCount).toBe(7)
    expect(merged[1]!.childCount).toBeUndefined()
  })

  it('never overwrites a count the fresh listing already has', () => {
    const merged = mergeChildCounts([entry('Projects', 1, 3)], [entry('Projects', 1, 99)])
    expect(merged[0]!.childCount).toBe(3)
  })

  it('ignores entries that no longer exist', () => {
    const merged = mergeChildCounts([entry('Projects', 1)], [entry('Deleted', 1, 4)])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.childCount).toBeUndefined()
  })

  it('returns the original array when there is nothing to merge', () => {
    const fresh = [entry('Projects', 1)]
    expect(mergeChildCounts(fresh, [])).toBe(fresh)
  })
})
