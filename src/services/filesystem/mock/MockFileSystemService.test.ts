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

  describe('moveEntries', () => {
    it('relocates an entry into a sibling folder', async () => {
      await fs.createDirectory(home, 'Inbox')
      await fs.createDirectory(home, 'mover')

      await fs.moveEntries([`${home}\\mover`], `${home}\\Inbox`)

      expect(await namesIn(home)).not.toContain('mover')
      expect(await namesIn(`${home}\\Inbox`)).toContain('mover')
    })

    it('rejects moving a folder into its own descendant', async () => {
      await fs.createDirectory(home, 'Outer')
      await fs.createDirectory(`${home}\\Outer`, 'Inner')

      await expect(
        fs.moveEntries([`${home}\\Outer`], `${home}\\Outer\\Inner`),
      ).rejects.toBeInstanceOf(FsError)
      // The guard must fire before anything moves.
      expect(await namesIn(home)).toContain('Outer')
    })

    it('rejects a name collision at the destination', async () => {
      await fs.createDirectory(home, 'Bin')
      await fs.createDirectory(home, 'dup')
      await fs.createDirectory(`${home}\\Bin`, 'dup')

      await expect(fs.moveEntries([`${home}\\dup`], `${home}\\Bin`)).rejects.toBeInstanceOf(FsError)
    })
  })

  describe('searchDirectory', () => {
    it('finds matches in nested folders', async () => {
      // The fixture's Projects/galaxy-app/main.tsx lives two levels down.
      const result = await fs.searchDirectory(home, 'main.tsx')
      const names = result.entries.map((e) => e.name)

      expect(names).toContain('main.tsx')
      expect(result.truncated).toBe(false)
    })

    it('is case-insensitive and matches folder names', async () => {
      const result = await fs.searchDirectory(home, 'PROJECTS')
      expect(result.entries.some((e) => e.name === 'Projects' && e.isDirectory)).toBe(true)
    })

    it('returns nothing for an empty query rather than everything', async () => {
      for (const query of ['', '   ']) {
        expect((await fs.searchDirectory(home, query)).entries).toHaveLength(0)
      }
    })

    it('produces real, resolvable paths for every result', async () => {
      const result = await fs.searchDirectory(home, 'e') // matches broadly
      expect(result.entries.length).toBeGreaterThan(0)

      // Each result must be listable at its own parent — a search hit that
      // cannot be navigated to would be useless.
      for (const entry of result.entries.filter((e) => e.isDirectory)) {
        await expect(fs.listDirectory(entry.path)).resolves.toBeTruthy()
      }
    })
  })
})
