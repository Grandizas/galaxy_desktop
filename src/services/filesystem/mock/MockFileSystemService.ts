import { classifyEntry } from '@/lib/classify'
import type { DirectoryListing, DriveInfo, FsEntry, SearchResult } from '@/types'
import { FsError } from '@/types'
import { dirname, join, normalizePath } from '@/utils/path'

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

  async countChildren(paths: readonly string[]): Promise<Record<string, number>> {
    await delay(LATENCY_MS)

    const counts: Record<string, number> = {}
    for (const path of paths) {
      const node = resolveNode(path)
      if (node?.isDirectory) counts[path] = node.children?.length ?? 0
    }
    return counts
  }

  async createDirectory(parent: string, name: string): Promise<FsEntry> {
    await delay(LATENCY_MS)

    const node = resolveNode(parent)
    if (!node?.isDirectory) throw new FsError('not-found', `No such directory: ${parent}`, parent)

    node.children ??= []
    if (node.children.some((child) => child.name === name)) {
      throw new FsError('unsupported', `"${name}" already exists here`, parent)
    }

    const created: MockNode = { name, isDirectory: true, modifiedAt: Date.now(), children: [] }
    node.children.push(created)
    return toEntry(created, normalizePath(parent))
  }

  async renameEntry(path: string, newName: string): Promise<FsEntry> {
    await delay(LATENCY_MS)

    const parentPath = dirname(path)
    const parent = parentPath ? resolveNode(parentPath) : null
    const node = resolveNode(path)
    if (!parent || !node) throw new FsError('not-found', `No such entry: ${path}`, path)

    if (parent.children?.some((child) => child.name === newName && child !== node)) {
      throw new FsError('unsupported', `"${newName}" already exists here`, path)
    }

    node.name = newName
    return toEntry(node, normalizePath(parentPath!))
  }

  async deleteEntries(paths: readonly string[]): Promise<readonly string[]> {
    await delay(LATENCY_MS)

    /*
     * All-or-nothing, matching the Rust backend: resolve every target before
     * removing any. Mutating as we iterate would leave earlier entries deleted
     * when a later one fails — a partial delete the interface forbids, and a
     * divergence between the mock and production for exactly the failure case
     * this contract exists to cover.
     */
    const doomed = paths.map((path) => {
      const parentPath = dirname(path)
      const parent = parentPath ? resolveNode(parentPath) : null
      const node = resolveNode(path)
      if (!parent?.children || !node) {
        throw new FsError('not-found', `No such entry: ${path}`, path)
      }
      return { parent, node }
    })

    for (const { parent, node } of doomed) {
      parent.children = parent.children!.filter((child) => child !== node)
    }
    return paths
  }

  async moveEntries(paths: readonly string[], targetDir: string): Promise<readonly string[]> {
    await delay(LATENCY_MS)

    const target = resolveNode(targetDir)
    if (!target?.isDirectory)
      throw new FsError('not-found', `No such directory: ${targetDir}`, targetDir)

    // Validate the whole batch before moving any, matching the backend.
    const planned = paths.map((path) => {
      const parentPath = dirname(path)
      const parent = parentPath ? resolveNode(parentPath) : null
      const node = resolveNode(path)
      if (!parent?.children || !node) {
        throw new FsError('not-found', `No such entry: ${path}`, path)
      }
      const normalized = normalizePath(path).toLowerCase()
      const targetNorm = normalizePath(targetDir).toLowerCase()
      if (targetNorm === normalized || targetNorm.startsWith(`${normalized}\\`)) {
        throw new FsError('unsupported', 'Cannot move a folder into itself', path)
      }
      if (target.children?.some((child) => child.name === node.name)) {
        throw new FsError('unsupported', `"${node.name}" already exists here`, path)
      }
      return { parent, node }
    })

    // Reject intra-batch conflicts before mutating, matching the backend: two
    // sources that would land on the same name collide once moving begins.
    const destNames = planned.map(({ node }) => node.name.toLowerCase())
    if (new Set(destNames).size !== destNames.length) {
      throw new FsError('unsupported', 'Two of the items would land on the same name', targetDir)
    }

    target.children ??= []
    const moved: string[] = []
    for (const { parent, node } of planned) {
      parent.children = parent.children!.filter((child) => child !== node)
      target.children.push(node)
      moved.push(join(normalizePath(targetDir), node.name))
    }
    return moved
  }

  async searchDirectory(root: string, query: string): Promise<SearchResult> {
    await delay(LATENCY_MS)

    const needle = query.trim().toLowerCase()
    if (!needle) return { entries: [], truncated: false, examined: 0 }

    const rootNode = resolveNode(root)
    if (!rootNode?.isDirectory) throw new FsError('not-found', `No such directory: ${root}`, root)

    const entries: FsEntry[] = []
    let examined = 0

    // Iterative walk, mirroring the Rust backend's structure.
    const stack: Array<{ node: MockNode; parentPath: string }> = [
      { node: rootNode, parentPath: dirname(normalizePath(root)) ?? '' },
    ]

    while (stack.length > 0) {
      const { node, parentPath } = stack.pop()!
      examined += 1
      const nodePath = join(parentPath, node.name)

      for (const child of node.children ?? []) {
        if (child.name.toLowerCase().includes(needle)) {
          entries.push(toEntry(child, nodePath))
        }
        if (child.isDirectory) stack.push({ node: child, parentPath: nodePath })
      }
    }

    entries.sort(
      (a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name),
    )
    return { entries, truncated: false, examined }
  }

  async openEntry(path: string): Promise<void> {
    console.warn(`[mock] openEntry(${path}) — no-op outside Tauri`)
  }

  async revealEntry(path: string): Promise<void> {
    console.warn(`[mock] revealEntry(${path}) — no-op outside Tauri`)
  }
}
