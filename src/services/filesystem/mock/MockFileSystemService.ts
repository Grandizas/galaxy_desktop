import { classifyEntry } from '@/lib/classify'
import type { DirectoryListing, DriveInfo, FsEntry } from '@/types'
import { FsError } from '@/types'
import { join, normalizePath } from '@/utils/path'

import type { FileSystemService } from '../types'
import { MOCK_DRIVES, MOCK_HOME_PATH, MOCK_ROOTS, type MockNode } from './fixtures'

/** Simulated I/O latency so loading states are exercised during development. */
const LATENCY_MS = 120

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function resolveNode(path: string): MockNode | null {
  const [drive, ...segments] = normalizePath(path).split('\\').filter(Boolean)
  if (!drive) return null

  let node = MOCK_ROOTS[drive.toUpperCase()]
  if (!node) return null

  for (const segment of segments) {
    const child = node.children?.find((candidate) => candidate.name === segment)
    if (!child) return null
    node = child
  }
  return node
}

function toEntry(node: MockNode, parentPath: string): FsEntry {
  return {
    path: join(parentPath, node.name),
    name: node.name,
    kind: classifyEntry(node.name, node.isDirectory),
    isDirectory: node.isDirectory,
    size: node.size ?? null,
    modifiedAt: node.modifiedAt ?? null,
    createdAt: node.modifiedAt ?? null,
    childCount: node.children?.length,
  }
}

/**
 * In-memory provider. Lets the whole UI run in a plain browser (`pnpm dev`)
 * without the Rust backend, and doubles as the fixture source for tests.
 */
export class MockFileSystemService implements FileSystemService {
  readonly id = 'mock' as const

  async getHomePath(): Promise<string> {
    return MOCK_HOME_PATH
  }

  async listDirectory(path: string): Promise<DirectoryListing> {
    await delay(LATENCY_MS)

    const node = resolveNode(path)
    if (!node) throw new FsError('not-found', `No such directory: ${path}`, path)
    if (!node.isDirectory) throw new FsError('unsupported', `Not a directory: ${path}`, path)

    const normalized = normalizePath(path)
    const entries = (node.children ?? []).map((child) => toEntry(child, normalized))

    return { path: normalized, entries, readAt: Date.now() }
  }

  async listDrives(): Promise<readonly DriveInfo[]> {
    await delay(LATENCY_MS)
    return MOCK_DRIVES
  }

  async openEntry(path: string): Promise<void> {
    console.warn(`[mock] openEntry(${path}) — no-op outside Tauri`)
  }

  async revealEntry(path: string): Promise<void> {
    console.warn(`[mock] revealEntry(${path}) — no-op outside Tauri`)
  }
}
