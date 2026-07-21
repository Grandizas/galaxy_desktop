import { beforeEach, describe, expect, it } from 'vitest'

import { setFileSystemService, type FileSystemService } from '@/services/filesystem'
import { useFilesystemStore } from '@/store/filesystemStore'
import { FsError, type DirectoryListing } from '@/types'

const listing = (path: string): DirectoryListing => ({
  path,
  entries: [
    {
      path: `${path}\\Projects`,
      name: 'Projects',
      kind: 'folder',
      isDirectory: true,
      size: null,
      modifiedAt: 1,
      createdAt: null,
    },
  ],
  readAt: 0,
})

/** Minimal stub; each test overrides only what it needs. */
function stub(overrides: Partial<FileSystemService> = {}): FileSystemService {
  return {
    id: 'mock',
    getHomePath: async () => 'C:\\Users\\Nova',
    listDirectory: async (path) => listing(path),
    listDrives: async () => [],
    countChildren: async () => ({}),
    openEntry: async () => {},
    revealEntry: async () => {},
    ...overrides,
  }
}

const reset = () =>
  useFilesystemStore.setState({
    currentPath: null,
    homePath: null,
    entries: [],
    drives: [],
    status: 'idle',
    error: null,
    history: [],
    historyIndex: -1,
    cache: new Map(),
  })

describe('filesystemStore.navigateTo', () => {
  beforeEach(() => {
    reset()
    setFileSystemService(stub())
  })

  it('reports success so callers can sequence an animation', async () => {
    const ok = await useFilesystemStore.getState().navigateTo('C:\\Users\\Nova')

    expect(ok).toBe(true)
    expect(useFilesystemStore.getState().status).toBe('ready')
  })

  /*
   * The warp transition relies on this: `navigateTo` catches its own errors, so
   * a rejected promise never surfaces. If failure were not reported in the
   * return value, the camera would "arrive" in a directory that never loaded.
   */
  it('reports failure instead of throwing', async () => {
    setFileSystemService(
      stub({
        listDirectory: async (path) => {
          throw new FsError('permission-denied', 'Access is denied', path)
        },
      }),
    )

    const ok = await useFilesystemStore.getState().navigateTo('C:\\Windows\\System32')

    expect(ok).toBe(false)
    expect(useFilesystemStore.getState().status).toBe('error')
    expect(useFilesystemStore.getState().error).toBe('Windows denied access to System32')
  })

  it('leaves the previous directory on screen when a navigation fails', async () => {
    await useFilesystemStore.getState().navigateTo('C:\\Users\\Nova')

    setFileSystemService(
      stub({
        listDirectory: async (path) => {
          throw new FsError('not-found', 'gone', path)
        },
      }),
    )
    await useFilesystemStore.getState().navigateTo('C:\\Gone')

    expect(useFilesystemStore.getState().currentPath).toBe('C:\\Users\\Nova')
    expect(useFilesystemStore.getState().entries).toHaveLength(1)
  })

  it('treats re-navigating to the current directory as success', async () => {
    await useFilesystemStore.getState().navigateTo('C:\\Users\\Nova')

    expect(await useFilesystemStore.getState().navigateTo('C:\\Users\\Nova')).toBe(true)
  })
})
