import { describe, expect, it } from 'vitest'

import type { FsEntry } from '@/types'

import { mapEntriesToGalaxy } from './mapEntriesToGalaxy'

const entry = (name: string, isDirectory: boolean, modifiedAt: number | null = 0): FsEntry => ({
  path: `C:\\Users\\Nova\\${name}`,
  name,
  kind: isDirectory ? 'folder' : 'doc',
  isDirectory,
  size: isDirectory ? null : 100,
  modifiedAt,
  createdAt: null,
})

const map = (entries: readonly FsEntry[], limits?: { maxPlanets?: number; maxMoons?: number }) =>
  mapEntriesToGalaxy('C:\\Users\\Nova', 'Nova', entries, limits)

describe('mapEntriesToGalaxy', () => {
  it('maps folders to planets and files to moons', () => {
    const system = map([entry('Projects', true), entry('notes.md', false)])

    expect(system.bodies).toHaveLength(2)
    expect(system.bodies.find((b) => b.label === 'Projects')?.type).toBe('planet')
    expect(system.bodies.find((b) => b.label === 'notes.md')?.type).toBe('moon')
    expect(system.hiddenCount).toBe(0)
  })

  it('is deterministic — the same path always yields the same layout', () => {
    const entries = [entry('Projects', true), entry('Pictures', true)]
    const a = map(entries)
    const b = map(entries)

    expect(a.bodies.map((body) => [body.color, body.radius, body.orbit.phase])).toEqual(
      b.bodies.map((body) => [body.color, body.radius, body.orbit.phase]),
    )
  })

  it('gives every body a unique id so React keys never collide', () => {
    const system = map([entry('Projects', true, 1), entry('notes.md', false)])
    const ids = system.bodies.flatMap((body) => [
      body.id,
      ...(body.satellites ?? []).map((s) => s.id),
    ])

    expect(new Set(ids).size).toBe(ids.length)
  })

  describe('render budget', () => {
    const folders = Array.from({ length: 50 }, (_, i) => entry(`dir-${i}`, true, i))
    const files = Array.from({ length: 50 }, (_, i) => entry(`file-${i}`, false, i))

    it('caps bodies and reports exactly what was dropped', () => {
      const system = map([...folders, ...files], { maxPlanets: 10, maxMoons: 20 })

      expect(system.bodies.filter((b) => b.type === 'planet')).toHaveLength(10)
      expect(system.bodies.filter((b) => b.type === 'moon')).toHaveLength(20)
      expect(system.hiddenCount).toBe(70) // 40 folders + 30 files
    })

    it('keeps the most recently modified entries', () => {
      const system = map(folders, { maxPlanets: 3 })

      expect(system.bodies.map((body) => body.label)).toEqual(['dir-49', 'dir-48', 'dir-47'])
    })

    it('does not truncate when the directory fits', () => {
      const system = map(folders.slice(0, 5), { maxPlanets: 10 })

      expect(system.bodies).toHaveLength(5)
      expect(system.hiddenCount).toBe(0)
    })
  })

  /**
   * Regression: System32 is full of near-identical names (ms-MY, ms-MT, nl-NL…).
   * A polynomial hash mapped them all to nearly the same angle, so every planet
   * sat on one bearing at a growing radius — a straight line into the void.
   */
  describe('layout under adversarial names', () => {
    const locales = [
      'ms-MY',
      'ms-MT',
      'nl-NL',
      'nb-NO',
      'pl-PL',
      'pt-BR',
      'pt-PT',
      'ro-RO',
      'ru-RU',
      'sk-SK',
      'sl-SI',
      'sr-Latn-RS',
    ].map((name, i) => entry(name, true, i))

    it('spreads similar names around the full circle', () => {
      const phases = map(locales).bodies.map((body) => body.orbit.phase)

      // Bucket into octants: a healthy layout touches most of them.
      const octants = new Set(phases.map((p) => Math.floor((p / (Math.PI * 2)) * 8)))
      expect(octants.size).toBeGreaterThanOrEqual(6)
    })

    it('never places two planets at the same bearing', () => {
      const phases = map(locales)
        .bodies.map((body) => body.orbit.phase)
        .sort((a, b) => a - b)

      const gaps = phases.slice(1).map((phase, i) => phase - phases[i]!)
      // Anything under ~2° would read as a single radial line on screen.
      expect(Math.min(...gaps)).toBeGreaterThan(0.035)
    })

    it('keeps a large system within camera range', () => {
      const many = Array.from({ length: 120 }, (_, i) => entry(`dir-${i}`, true, i))
      const radii = map(many, { maxPlanets: 120 }).bodies.map((body) => body.orbit.radius)

      // maxDistance is 160; the outermost orbit must stay comfortably inside it.
      expect(Math.max(...radii)).toBeLessThan(110)
    })
  })

  it('only gives satellites to folders whose child count is known', () => {
    const known: FsEntry = { ...entry('Projects', true), childCount: 3 }
    const unknown = entry('Pictures', true)
    const system = map([known, unknown])

    expect(system.bodies.find((b) => b.label === 'Projects')?.satellites).toHaveLength(3)
    expect(system.bodies.find((b) => b.label === 'Pictures')?.satellites).toHaveLength(0)
  })
})
