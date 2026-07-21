import type { DirectoryListing, DriveInfo } from '@/types'

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

  /** Opens an entry with the OS default handler. */
  openEntry(path: string): Promise<void>

  /** Reveals an entry in Windows Explorer. */
  revealEntry(path: string): Promise<void>
}
