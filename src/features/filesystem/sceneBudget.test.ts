import { describe, expect, it } from 'vitest'

import { GALAXY } from '@/lib/constants'
import type { FsEntry } from '@/types'

import { mapEntriesToGalaxy } from './mapEntriesToGalaxy'
import { estimateDrawCalls } from './sceneBudget'

const entry = (name: string, isDirectory: boolean, childCount?: number): FsEntry => ({
  path: `C:\\Windows\\System32\\${name}`,
  name,
  kind: isDirectory ? 'folder' : 'doc',
  isDirectory,
  size: 1,
  modifiedAt: 1,
  createdAt: null,
  ...(childCount === undefined ? {} : { childCount }),
})

/** A directory the size of C:\Windows\System32. */
const hugeDirectory = [
  ...Array.from({ length: 200 }, (_, i) => entry(`dir-${i}`, true, 5)),
  ...Array.from({ length: 4800 }, (_, i) => entry(`file-${i}.dll`, false)),
]

describe('scene budget', () => {
  const system = mapEntriesToGalaxy('C:\\Windows\\System32', 'System32', hugeDirectory)

  it('truncates a huge directory to the render budget', () => {
    const folders = hugeDirectory.filter((entry) => entry.isDirectory).length
    const files = hugeDirectory.length - folders
    const expected = Math.min(folders, GALAXY.maxPlanets) + Math.min(files, GALAXY.maxMoons)

    expect(system.bodies).toHaveLength(expected)
    expect(system.hiddenCount).toBe(hugeDirectory.length - expected)
  })

  it('instancing removes the per-body draw call', () => {
    const before = estimateDrawCalls(system, false)
    const after = estimateDrawCalls(system, true)

    // One mesh per planet, ring, moon and satellite adds up fast.
    expect(before).toBeGreaterThan(600)

    // Planets stay individual; everything else collapses into two meshes.
    expect(after).toBeLessThan(GALAXY.maxPlanets + 10)
    expect(after).toBeLessThan(before / 4)
  })

  it('keeps draw calls flat as the file count grows', () => {
    const small = mapEntriesToGalaxy('C:\\A', 'A', hugeDirectory.slice(0, 40))
    const large = mapEntriesToGalaxy('C:\\B', 'B', hugeDirectory)

    const growth = estimateDrawCalls(large) - estimateDrawCalls(small)

    // Only the planet count may grow; files must not add draw calls at all.
    expect(growth).toBeLessThanOrEqual(GALAXY.maxPlanets)
  })
})
