import { env } from '@/lib/env'
import { isTauri } from '@/services/platform'

import { MockFileSystemService } from './mock/MockFileSystemService'
import { TauriFileSystemService } from './tauri/TauriFileSystemService'
import type { FileSystemService } from './types'

export type { FileSystemService } from './types'

let instance: FileSystemService | null = null

/**
 * Resolves the active provider once per session. Falls back to the mock
 * implementation whenever the Tauri bridge is unavailable (e.g. `pnpm dev`).
 */
export function getFileSystemService(): FileSystemService {
  if (!instance) {
    instance =
      env.fsProvider === 'tauri' && isTauri()
        ? new TauriFileSystemService()
        : new MockFileSystemService()
  }
  return instance
}

/** Test/debug seam for swapping the provider at runtime. */
export function setFileSystemService(service: FileSystemService | null): void {
  instance = service
}
