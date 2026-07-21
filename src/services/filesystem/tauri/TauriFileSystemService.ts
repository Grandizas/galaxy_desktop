import { invoke } from '@tauri-apps/api/core'
import { openPath } from '@tauri-apps/plugin-opener'

import { classifyEntry } from '@/lib/classify'
import type { DirectoryListing, DriveInfo, FsEntry } from '@/types'
import { FsError } from '@/types'
import { normalizePath } from '@/utils/path'

import type { FileSystemService } from '../types'

/** Wire format returned by the Rust `list_directory` command. */
interface RawEntry {
  path: string
  name: string
  is_directory: boolean
  size: number | null
  modified_at: number | null
  created_at: number | null
}

interface RawDrive {
  path: string
  label: string
  total_bytes: number | null
  free_bytes: number | null
}

const toEntry = (raw: RawEntry): FsEntry => ({
  path: raw.path,
  name: raw.name,
  kind: classifyEntry(raw.name, raw.is_directory),
  isDirectory: raw.is_directory,
  size: raw.size,
  modifiedAt: raw.modified_at,
  createdAt: raw.created_at,
})

function toFsError(error: unknown, path: string): FsError {
  const message = typeof error === 'string' ? error : String(error)
  if (message.includes('os error 2') || message.toLowerCase().includes('not found')) {
    return new FsError('not-found', message, path)
  }
  if (message.includes('os error 5') || message.toLowerCase().includes('denied')) {
    return new FsError('permission-denied', message, path)
  }
  return new FsError('unknown', message, path)
}

/**
 * Real Windows filesystem, bridged through the Rust backend.
 * Enabled with `VITE_FS_PROVIDER=tauri` when running inside the desktop shell.
 */
export class TauriFileSystemService implements FileSystemService {
  readonly id = 'tauri' as const

  async getHomePath(): Promise<string> {
    return invoke<string>('get_home_dir')
  }

  async listDirectory(path: string): Promise<DirectoryListing> {
    try {
      const entries = await invoke<RawEntry[]>('list_directory', { path })
      return { path: normalizePath(path), entries: entries.map(toEntry), readAt: Date.now() }
    } catch (error) {
      throw toFsError(error, path)
    }
  }

  async listDrives(): Promise<readonly DriveInfo[]> {
    const drives = await invoke<RawDrive[]>('list_drives')
    return drives.map((drive) => ({
      path: drive.path,
      label: drive.label,
      totalBytes: drive.total_bytes,
      freeBytes: drive.free_bytes,
    }))
  }

  async countChildren(paths: readonly string[]): Promise<Record<string, number>> {
    if (paths.length === 0) return {}
    return invoke<Record<string, number>>('count_children', { paths })
  }

  async openEntry(path: string): Promise<void> {
    await openPath(path)
  }

  async revealEntry(path: string): Promise<void> {
    await invoke('reveal_in_explorer', { path })
  }
}
