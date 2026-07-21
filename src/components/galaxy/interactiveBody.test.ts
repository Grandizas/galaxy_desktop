import { describe, expect, it } from 'vitest'

import { mapEntriesToGalaxy } from '@/features/filesystem/mapEntriesToGalaxy'
import type { CelestialBody, FsEntry, OrbitParams } from '@/types'

import { interactiveBodyAt } from './interactiveBody'

const entry = (name: string, isDirectory: boolean, childCount?: number): FsEntry => ({
  path: `C:\\Users\\Nova\\${name}`,
  name,
  kind: isDirectory ? 'folder' : 'doc',
  isDirectory,
  size: isDirectory ? null : 10,
  modifiedAt: 1,
  createdAt: null,
  ...(childCount === undefined ? {} : { childCount }),
})

/**
 * Regression: a sparse folder is mostly satellites, so making them interactive
 * meant almost every small body did nothing when hovered or clicked.
 */
describe('interactiveBodyAt', () => {
  // Mirrors C:\Users\Nova: seven folders with contents, two loose files.
  const entries = [
    ...['Desktop', 'Documents', 'Downloads', 'Pictures', 'Videos', 'Music', 'Projects'].map((n) =>
      entry(n, true, 4),
    ),
    entry('profile.png', false),
    entry('backup-2025.zip', false),
  ]

  const system = mapEntriesToGalaxy('C:\\Users\\Nova', 'Nova', entries)
  const planets = system.bodies.filter((b) => b.type === 'planet')
  const instanced: Array<{ body: CelestialBody; parent?: OrbitParams }> = [
    ...system.bodies.filter((b) => b.type !== 'planet').map((body) => ({ body })),
    ...planets.flatMap((p) => (p.satellites ?? []).map((body) => ({ body, parent: p.orbit }))),
  ]

  it('this folder really is mostly satellites', () => {
    const satellites = instanced.filter((i) => i.body.type === 'satellite')
    expect(satellites.length).toBeGreaterThan(instanced.length / 2)
  })

  it('resolves real files', () => {
    const index = instanced.findIndex((i) => i.body.type === 'moon')
    expect(interactiveBodyAt(instanced, index)?.label).toBeTruthy()
  })

  it('ignores decorative satellites', () => {
    const index = instanced.findIndex((i) => i.body.type === 'satellite')
    expect(index).toBeGreaterThanOrEqual(0)
    expect(interactiveBodyAt(instanced, index)).toBeUndefined()
  })

  it('never resolves a body without a usable label or a real path', () => {
    for (let index = 0; index < instanced.length; index++) {
      const body = interactiveBodyAt(instanced, index)
      if (!body) continue

      expect(body.label).not.toBe('')
      expect(body.id).not.toContain('#satellite-')
    }
  })

  it('ignores a miss', () => {
    expect(interactiveBodyAt(instanced, undefined)).toBeUndefined()
    expect(interactiveBodyAt(instanced, 9999)).toBeUndefined()
  })
})
