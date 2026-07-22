import type { FsEntry } from '@/types'
import { dirname, normalizePath } from '@/utils/path'

/**
 * Whether `source` can be dropped into `targetDir`.
 *
 * Mirrors the backend's `resolve_move_target` guards so the drag UI can grey
 * out invalid targets *before* a move is attempted — the authoritative check
 * still runs in Rust. Case-insensitive to match Windows.
 */
export function canDrop(source: FsEntry, targetDir: string): boolean {
  const src = normalizePath(source.path).toLowerCase()
  const target = normalizePath(targetDir).toLowerCase()

  // Already there.
  if (dirname(source.path)?.toLowerCase() === target) return false

  // Into itself or one of its own descendants.
  if (target === src || target.startsWith(`${src}\\`)) return false

  return true
}
