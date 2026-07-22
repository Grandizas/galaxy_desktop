import type { DirectoryListing, DriveInfo, FsEntry, SearchResult } from '@/types'

/**
 * The single contract the UI knows about. Swapping the mock provider for the
 * real Windows backend must never require touching a component.
 */
export interface FileSystemService {
  readonly id: 'mock' | 'tauri'

  /** Path the galaxy opens on (user home, or the mock root). */
  getHomePath(): Promise<string>

  listDirectory(path: string): Promise<DirectoryListing>

  listDrives(): Promise<readonly DriveInfo[]>

  /**
   * Direct child counts, keyed by path. Called after a listing renders so the
   * galaxy is never blocked on it; unreadable directories are simply absent.
   */
  countChildren(paths: readonly string[]): Promise<Record<string, number>>

  createDirectory(parent: string, name: string): Promise<FsEntry>

  renameEntry(path: string, newName: string): Promise<FsEntry>

  /**
   * Moves entries to the Recycle Bin — never a permanent delete.
   * Rejects the whole batch if any path is protected.
   */
  deleteEntries(paths: readonly string[]): Promise<readonly string[]>

  /**
   * Case-insensitive recursive search of a subtree by name. Bounded by the
   * backend; check `truncated` to know whether results were capped.
   */
  searchDirectory(root: string, query: string): Promise<SearchResult>

  /** Opens an entry with the OS default handler. */
  openEntry(path: string): Promise<void>

  /** Reveals an entry in Windows Explorer. */
  revealEntry(path: string): Promise<void>
}
