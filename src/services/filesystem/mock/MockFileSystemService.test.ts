import { beforeEach, describe, expect, it } from 'vitest'

import { FsError } from '@/types'

import { MockFileSystemService } from './MockFileSystemService'

/**
 * The mock is what `pnpm dev` and most tests exercise, so any divergence from
 * the Rust backend hides bugs until they reach production. These tests pin the
 * shared contract rather than the mock's internals.
 */
describe('MockFileSystemService', () => {
  let fs: MockFileSystemService
  let home: string

  beforeEach(async () => {
    fs = new MockFileSystemService()
    home = await fs.getHomePath()
  })

  const namesIn = async (path: string) =>
    (await fs.listDirectory(path)).entries.map((entry) => entry.name)

  it('creates a directory and lists it', async () => {
    const created = await fs.createDirectory(home, 'Fresh World')

    expect(created.isDirectory).toBe(true)
    expect(await namesIn(home)).toContain('Fresh World')
  })

  it('refuses a duplicate name', async () => {
    await fs.createDirectory(home, 'Twice')
    await expect(fs.createDirectory(home, 'Twice')).rejects.toBeInstanceOf(FsError)
  })

  it('renames in place', async () => {
    const created = await fs.createDirectory(home, 'Before')
    const renamed = await fs.renameEntry(created.path, 'After')

    expect(renamed.name).toBe('After')
    const names = await namesIn(home)
    expect(names).toContain('After')
    expect(names).not.toContain('Before')
  })

  it('deletes all or nothing when a path is missing', async () => {
    await fs.createDirectory(home, 'Doomed')
    const doomed = `${home}\\Doomed`
    const missing = `${home}\\NeverExisted`

    await expect(fs.deleteEntries([doomed, missing])).rejects.toBeInstanceOf(FsError)

    // The Rust backend validates every target before removing any; the mock
    // must not leave the first entry deleted when the second fails.
    expect(await namesIn(home)).toContain('Doomed')
  })

  it('deletes every path when all of them resolve', async () => {
    await fs.createDirectory(home, 'A')
    await fs.createDirectory(home, 'B')

    await fs.deleteEntries([`${home}\\A`, `${home}\\B`])

    const names = await namesIn(home)
    expect(names).not.toContain('A')
    expect(names).not.toContain('B')
  })
})
