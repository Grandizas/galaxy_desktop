/**
 * Windows-first path helpers. Kept dependency-free so they can run in the
 * renderer without touching the Tauri bridge.
 */

const SEPARATOR = '\\'
const DRIVE_ROOT = /^[A-Za-z]:$/

/**
 * Canonical form for a Windows path: backslashes, no trailing separator —
 * except drive roots, which must keep it (`C:\`, never `C:`).
 *
 * Every path entering the app passes through here, so a folder can only ever
 * have one identity. Two spellings of the same directory would mean two cache
 * entries and a stale galaxy.
 */
export function normalizePath(path: string): string {
  const normalized = path.replace(/\//g, SEPARATOR).replace(/\\+$/, '')
  return DRIVE_ROOT.test(normalized) ? `${normalized}${SEPARATOR}` : normalized
}

export function basename(path: string): string {
  const normalized = normalizePath(path).replace(/\\$/, '')
  const index = normalized.lastIndexOf(SEPARATOR)
  return index === -1 ? normalized : normalized.slice(index + 1)
}

/** Parent directory, or null at a drive root — a galaxy has to stop somewhere. */
export function dirname(path: string): string | null {
  const normalized = normalizePath(path)
  if (normalized.endsWith(SEPARATOR)) return null

  const index = normalized.lastIndexOf(SEPARATOR)
  if (index <= 0) return null
  return normalizePath(normalized.slice(0, index))
}

export function join(...segments: string[]): string {
  const parts = segments.filter(Boolean)
  if (parts.length === 0) return ''

  const head = normalizePath(parts[0]!)
  const tail = parts
    .slice(1)
    .map((segment) => normalizePath(segment).replace(/^\\+/, ''))
    .filter(Boolean)

  if (tail.length === 0) return head
  // A drive root already carries its separator; anything else needs one.
  return head.endsWith(SEPARATOR) ? head + tail.join(SEPARATOR) : [head, ...tail].join(SEPARATOR)
}

export function extension(path: string): string {
  const name = basename(path)
  const index = name.lastIndexOf('.')
  return index <= 0 ? '' : name.slice(index + 1).toLowerCase()
}

/** Splits a path into cumulative segments, ready for a breadcrumb trail. */
export function pathSegments(path: string): Array<{ label: string; path: string }> {
  const normalized = normalizePath(path)
  if (!normalized) return []

  const parts = normalized.split(SEPARATOR).filter(Boolean)
  let cursor = ''
  return parts.map((part, index) => {
    cursor = index === 0 ? `${part}${SEPARATOR}` : join(cursor, part)
    return { label: part, path: cursor }
  })
}
