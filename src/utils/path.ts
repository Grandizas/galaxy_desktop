/**
 * Windows-first path helpers. Kept dependency-free so they can run in the
 * renderer without touching the Tauri bridge.
 */

const SEPARATOR = '\\'

export const normalizePath = (path: string) => path.replace(/\//g, SEPARATOR).replace(/\\+$/, '')

export function basename(path: string): string {
  const normalized = normalizePath(path)
  const index = normalized.lastIndexOf(SEPARATOR)
  return index === -1 ? normalized : normalized.slice(index + 1) || normalized
}

export function dirname(path: string): string | null {
  const normalized = normalizePath(path)
  const index = normalized.lastIndexOf(SEPARATOR)
  if (index <= 0) return null
  const parent = normalized.slice(0, index)
  // "C:" alone is not a valid path — keep the trailing separator for drive roots.
  return /^[A-Za-z]:$/.test(parent) ? `${parent}${SEPARATOR}` : parent
}

export const join = (...segments: string[]) =>
  segments
    .filter(Boolean)
    .map((segment, i) =>
      i === 0 ? normalizePath(segment) : normalizePath(segment).replace(/^\\/, ''),
    )
    .join(SEPARATOR)

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
