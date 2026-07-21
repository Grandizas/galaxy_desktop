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

const folders = (count: number) =>
  Array.from({ length: count }, (_, i) => entry(`dir-${i}`, true, 5))
const files = (count: number) =>
  Array.from({ length: count }, (_, i) => entry(`file-${i}.dll`, false))

/**
 * Deliberately over *both* budgets. An earlier fixture had 200 folders against
 * a 220-planet budget, so a regression that removed folder truncation entirely
 * would still have passed.
 */
const hugeDirectory = [...folders(GALAXY.maxPlanets + 80), ...files(GALAXY.maxMoons + 2300)]

describe('scene budget', () => {
  const system = mapEntriesToGalaxy('C:\\Windows\\System32', 'System32', hugeDirectory)

  it('truncates a huge directory to the render budget', () => {
    const folderCount = hugeDirectory.filter((entry) => entry.isDirectory).length
    const fileCount = hugeDirectory.length - folderCount

    // Both axes must actually exceed their budget, or this asserts nothing.
    expect(folderCount).toBeGreaterThan(GALAXY.maxPlanets)
    expect(fileCount).toBeGreaterThan(GALAXY.maxMoons)

    expect(system.bodies.filter((b) => b.type === 'planet')).toHaveLength(GALAXY.maxPlanets)
    expect(system.bodies.filter((b) => b.type !== 'planet')).toHaveLength(GALAXY.maxMoons)
    expect(system.hiddenCount).toBe(hugeDirectory.length - system.bodies.length)
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
    // Identical folders in both, so the only variable is the number of files.
    // Comparing a folder-only directory against a mixed one would let the
    // planet allowance absorb any number of stray file draw calls.
    const sameFolders = folders(30)

    const oneFile = mapEntriesToGalaxy('C:\\A', 'A', [...sameFolders, ...files(1)])
    const manyFiles = mapEntriesToGalaxy('C:\\B', 'B', [...sameFolders, ...files(2000)])

    expect(estimateDrawCalls(manyFiles)).toBe(estimateDrawCalls(oneFile))
    // And the extra files really are being rendered, not silently dropped.
    expect(manyFiles.bodies.length).toBeGreaterThan(oneFile.bodies.length + 1000)
  })
})
