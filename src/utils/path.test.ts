import { describe, expect, it } from 'vitest'

import { basename, dirname, extension, join, normalizePath, pathSegments } from './path'

describe('normalizePath', () => {
  it('converts forward slashes and drops trailing separators', () => {
    expect(normalizePath('C:/Users/Nova/')).toBe('C:\\Users\\Nova')
    expect(normalizePath('C:\\Users\\Nova\\\\')).toBe('C:\\Users\\Nova')
  })

  it('keeps the separator on drive roots so they have one identity', () => {
    expect(normalizePath('C:')).toBe('C:\\')
    expect(normalizePath('C:\\')).toBe('C:\\')
    expect(normalizePath('c:/')).toBe('c:\\')
  })

  it('is idempotent', () => {
    for (const path of ['C:\\', 'C:\\Users', 'C:/Users/Nova/']) {
      expect(normalizePath(normalizePath(path))).toBe(normalizePath(path))
    }
  })
})

describe('basename', () => {
  it('returns the last segment', () => {
    expect(basename('C:\\Users\\Nova')).toBe('Nova')
    expect(basename('C:/Users/Nova/notes.md')).toBe('notes.md')
  })

  it('returns the drive for a drive root', () => {
    expect(basename('C:\\')).toBe('C:')
  })
})

describe('dirname', () => {
  it('walks up one level', () => {
    expect(dirname('C:\\Users\\Nova')).toBe('C:\\Users')
    expect(dirname('C:\\Users')).toBe('C:\\')
  })

  it('stops at the drive root', () => {
    expect(dirname('C:\\')).toBeNull()
  })
})

describe('join', () => {
  it('does not double the separator at a drive root', () => {
    expect(join('C:\\', 'Users')).toBe('C:\\Users')
    expect(join('C:', 'Users', 'Nova')).toBe('C:\\Users\\Nova')
  })

  it('joins nested segments', () => {
    expect(join('C:\\Users', 'Nova')).toBe('C:\\Users\\Nova')
    expect(join('C:\\Users', '\\Nova')).toBe('C:\\Users\\Nova')
  })

  it('ignores empty segments', () => {
    expect(join('C:\\Users', '', 'Nova')).toBe('C:\\Users\\Nova')
    expect(join()).toBe('')
  })
})

describe('extension', () => {
  it('lowercases and excludes dotfiles', () => {
    expect(extension('render-FINAL.PNG')).toBe('png')
    expect(extension('.gitignore')).toBe('')
    expect(extension('README')).toBe('')
  })
})

describe('pathSegments', () => {
  it('produces a navigable breadcrumb trail', () => {
    expect(pathSegments('C:\\Users\\Nova')).toEqual([
      { label: 'C:', path: 'C:\\' },
      { label: 'Users', path: 'C:\\Users' },
      { label: 'Nova', path: 'C:\\Users\\Nova' },
    ])
  })

  it('handles a drive root', () => {
    expect(pathSegments('C:\\')).toEqual([{ label: 'C:', path: 'C:\\' }])
  })

  it('returns nothing for an empty path', () => {
    expect(pathSegments('')).toEqual([])
  })
})
