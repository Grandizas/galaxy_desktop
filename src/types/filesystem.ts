/** Domain model for the file system. Deliberately platform-agnostic. */

export type EntryKind = 'folder' | 'image' | 'video' | 'audio' | 'archive' | 'app' | 'code' | 'doc'

export interface FsEntry {
  /** Absolute path — the stable identity of an entry across the whole app. */
  readonly path: string
  readonly name: string
  readonly kind: EntryKind
  readonly isDirectory: boolean
  /** Bytes. `null` for directories whose size has not been computed. */
  readonly size: number | null
  readonly modifiedAt: number | null
  readonly createdAt: number | null
  /** Only populated once a directory has been read. */
  readonly childCount?: number
}

export interface DirectoryListing {
  readonly path: string
  readonly entries: readonly FsEntry[]
  readonly readAt: number
}

export interface SearchResult {
  readonly entries: readonly FsEntry[]
  /** A limit stopped the walk before the whole subtree was seen. */
  readonly truncated: boolean
  /** Directories descended into. */
  readonly examined: number
}

export interface DriveInfo {
  readonly path: string
  readonly label: string
  readonly totalBytes: number | null
  readonly freeBytes: number | null
}

export type FsErrorCode = 'not-found' | 'permission-denied' | 'unsupported' | 'unknown'

export class FsError extends Error {
  constructor(
    readonly code: FsErrorCode,
    message: string,
    readonly path?: string,
  ) {
    super(message)
    this.name = 'FsError'
  }
}
