import type { FsEntry } from '@/types'

/**
 * Most recently modified first; undated entries sort last, name-ordered.
 *
 * Shared by the renderer's budget and the store's child-count enrichment: if
 * the two picked differently, the planets on screen would not be the ones whose
 * satellites were fetched.
 */
export function byRecency(entries: readonly FsEntry[], limit?: number): FsEntry[] {
  const sorted = [...entries].sort(
    (a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0) || a.name.localeCompare(b.name),
  )
  return limit === undefined ? sorted : sorted.slice(0, limit)
}

/**
 * Copies known `childCount` values onto a fresh listing.
 *
 * Re-reading a cached directory returns entries without counts. Without this
 * merge the satellites vanish for a frame and then pop back once enrichment
 * completes — a visible flicker on every revisit.
 */
export function mergeChildCounts(
  fresh: readonly FsEntry[],
  previous: readonly FsEntry[],
): readonly FsEntry[] {
  const known = new Map<string, number>()
  for (const entry of previous) {
    if (entry.childCount !== undefined) known.set(entry.path, entry.childCount)
  }
  if (known.size === 0) return fresh

  return fresh.map((entry) => {
    const count = known.get(entry.path)
    return count === undefined || entry.childCount !== undefined
      ? entry
      : { ...entry, childCount: count }
  })
}
