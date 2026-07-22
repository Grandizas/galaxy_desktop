import { describe, expect, it } from 'vitest'

import type { FsEntry } from '@/types'

import { canDrop } from './canDrop'

const entry = (path: string, isDirectory = true): FsEntry => ({
  path,
  name: path.split('\\').pop()!,
  kind: isDirectory ? 'folder' : 'doc',
  isDirectory,
  size: isDirectory ? null : 1,
  modifiedAt: 1,
  createdAt: null,
})

describe('canDrop', () => {
  it('allows a move into a sibling folder', () => {
    expect(canDrop(entry('C:\\Users\\Nova\\file.txt', false), 'C:\\Users\\Nova\\Docs')).toBe(true)
  })

  it('rejects dropping onto the folder it already lives in', () => {
    expect(canDrop(entry('C:\\Users\\Nova\\file.txt', false), 'C:\\Users\\Nova')).toBe(false)
  })

  it('rejects dropping a folder into itself', () => {
    expect(canDrop(entry('C:\\Users\\Nova\\Projects'), 'C:\\Users\\Nova\\Projects')).toBe(false)
  })

  it('rejects dropping a folder into its own descendant', () => {
    // The data-loss case: moving Projects into Projects\galaxy-app.
    expect(
      canDrop(entry('C:\\Users\\Nova\\Projects'), 'C:\\Users\\Nova\\Projects\\galaxy-app'),
    ).toBe(false)
  })

  it('is case-insensitive, matching Windows', () => {
    expect(canDrop(entry('C:\\Users\\Nova\\Projects'), 'c:\\users\\nova\\projects\\sub')).toBe(
      false,
    )
  })

  it('does not mistake a sibling with a shared prefix for a descendant', () => {
    // C:\Users\Nova\Proj is not inside C:\Users\Nova\Projects.
    expect(canDrop(entry('C:\\Users\\Nova\\Projects'), 'C:\\Users\\Nova\\Proj')).toBe(true)
  })
})
