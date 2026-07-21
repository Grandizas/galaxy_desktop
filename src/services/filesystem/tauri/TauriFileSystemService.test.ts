import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FsError } from '@/types'

const invoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invoke(...args) }))
vi.mock('@tauri-apps/plugin-opener', () => ({ openPath: vi.fn() }))

const { TauriFileSystemService } = await import('./TauriFileSystemService')

/**
 * Guards the IPC contract with `src-tauri/src/filesystem.rs`. The Rust side is
 * snake_case and the renderer is camelCase, so a rename on either side would
 * otherwise fail silently — every entry would look like an unmodified file.
 */
describe('TauriFileSystemService', () => {
  const service = new TauriFileSystemService()

  // mockClear, not mockReset: resetting strips the implementation, and Vitest
  // then surfaces each rejection as an unhandled "Unknown Error".
  beforeEach(() => {
    invoke.mockClear()
    invoke.mockImplementation(() => Promise.resolve(undefined))
  })

  it('translates the Rust wire format into domain entries', async () => {
    invoke.mockResolvedValue([
      {
        path: 'C:\\Users\\Nova\\Projects',
        name: 'Projects',
        is_directory: true,
        size: null,
        modified_at: 1_700_000_000_000,
        created_at: null,
      },
      {
        path: 'C:\\Users\\Nova\\render.PNG',
        name: 'render.PNG',
        is_directory: false,
        size: 2048,
        modified_at: null,
        created_at: null,
      },
    ])

    const listing = await service.listDirectory('C:\\Users\\Nova')

    expect(invoke).toHaveBeenCalledWith('list_directory', { path: 'C:\\Users\\Nova' })
    expect(listing.entries[0]).toMatchObject({
      name: 'Projects',
      isDirectory: true,
      kind: 'folder',
      size: null,
      modifiedAt: 1_700_000_000_000,
    })
    // Classification runs on the renderer side and must be case-insensitive.
    expect(listing.entries[1]).toMatchObject({
      isDirectory: false,
      kind: 'image',
      size: 2048,
    })
  })

  it('translates drive fields', async () => {
    invoke.mockResolvedValue([
      { path: 'C:\\', label: 'Local Disk (C:)', total_bytes: 1024, free_bytes: 512 },
    ])

    const [drive] = await service.listDrives()

    expect(drive).toEqual({
      path: 'C:\\',
      label: 'Local Disk (C:)',
      totalBytes: 1024,
      freeBytes: 512,
    })
  })

  /**
   * Asserted via catch rather than `.rejects.toMatchObject`: that matcher
   * compares Error subclasses by message alone and would ignore `code`.
   */
  const failWith = async (reason: string, path: string): Promise<FsError> => {
    invoke.mockImplementation(() => Promise.reject(reason))
    try {
      await service.listDirectory(path)
      throw new Error(`Expected listDirectory to reject for ${path}`)
    } catch (error) {
      if (!(error instanceof FsError)) throw error
      return error
    }
  }

  it('classifies a denied system folder', async () => {
    const error = await failWith('C:\\Windows: Access is denied. (os error 5)', 'C:\\Windows')

    expect(error).toBeInstanceOf(FsError)
    expect(error.code).toBe('permission-denied')
    expect(error.path).toBe('C:\\Windows')
  })

  it('classifies a missing path', async () => {
    const error = await failWith('The system cannot find the path. (os error 2)', 'C:\\nope')

    expect(error.code).toBe('not-found')
  })

  it('falls back to unknown for unrecognised failures', async () => {
    const error = await failWith('something inexplicable happened', 'C:\\x')

    expect(error.code).toBe('unknown')
  })

  it('skips the IPC round trip when there is nothing to count', async () => {
    await expect(service.countChildren([])).resolves.toEqual({})
    expect(invoke).not.toHaveBeenCalled()
  })

  it('passes paths through to count_children', async () => {
    invoke.mockResolvedValue({ 'C:\\Users\\Nova\\Projects': 4 })

    const counts = await service.countChildren(['C:\\Users\\Nova\\Projects'])

    expect(invoke).toHaveBeenCalledWith('count_children', {
      paths: ['C:\\Users\\Nova\\Projects'],
    })
    expect(counts).toEqual({ 'C:\\Users\\Nova\\Projects': 4 })
  })
})
