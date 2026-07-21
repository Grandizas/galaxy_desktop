import { describe, expect, it } from 'vitest'

import { mapEntriesToGalaxy } from '@/features/filesystem/mapEntriesToGalaxy'
import type { CelestialBody, FsEntry, OrbitParams } from '@/types'

const HOVER_SCALE = 1.6

const entry = (name: string, isDirectory: boolean, childCount?: number): FsEntry => ({
  path: `C:\\X\\${name}`,
  name,
  kind: isDirectory ? 'folder' : 'doc',
  isDirectory,
  size: 1,
  modifiedAt: 1,
  createdAt: null,
  ...(childCount === undefined ? {} : { childCount }),
})

/** Mirrors the position maths in MoonField's frame loop. */
function positionAt(orbit: OrbitParams, time: number) {
  const angle = orbit.phase + time * orbit.speed
  return {
    x: Math.cos(angle) * orbit.radius,
    y: Math.sin(angle) * orbit.radius * Math.sin(orbit.inclination),
    z: Math.sin(angle) * orbit.radius,
  }
}

/** Mirrors the envelope calculation MoonField assigns as its bounding sphere. */
function envelopeRadius(bodies: Array<{ body: CelestialBody; parent?: OrbitParams }>) {
  let radius = 0
  for (const { body, parent } of bodies) {
    radius = Math.max(radius, body.orbit.radius + (parent?.radius ?? 0) + body.radius * HOVER_SCALE)
  }
  return radius * 1.1
}

describe('orbital envelope', () => {
  const directory = [
    ...Array.from({ length: 60 }, (_, i) => entry(`dir-${i}`, true, 4)),
    ...Array.from({ length: 400 }, (_, i) => entry(`file-${i}`, false)),
  ]
  const system = mapEntriesToGalaxy('C:\\X', 'X', directory)

  const planets = system.bodies.filter((body) => body.type === 'planet')
  const instanced: Array<{ body: CelestialBody; parent?: OrbitParams }> = [
    ...system.bodies.filter((body) => body.type !== 'planet').map((body) => ({ body })),
    ...planets.flatMap((planet) =>
      (planet.satellites ?? []).map((body) => ({ body, parent: planet.orbit })),
    ),
  ]

  it('contains every instance for a full orbit', () => {
    const radius = envelopeRadius(instanced)
    expect(radius).toBeGreaterThan(0)

    // Sample a long span: the slowest orbits take a while to come round.
    for (let time = 0; time < 600; time += 3.7) {
      for (const { body, parent } of instanced) {
        const local = positionAt(body.orbit, time)
        const origin = parent ? positionAt(parent, time) : { x: 0, y: 0, z: 0 }

        const distance = Math.hypot(local.x + origin.x, local.y + origin.y, local.z + origin.z)
        const outer = distance + body.radius * HOVER_SCALE

        expect(outer).toBeLessThanOrEqual(radius)
      }
    }
  })

  it('accounts for satellites riding on a moving planet', () => {
    const satellites = instanced.filter((item) => item.parent)
    expect(satellites.length).toBeGreaterThan(0)

    // A satellite's reach is its own orbit plus its planet's — ignoring the
    // parent would produce a sphere that clips them at the far side.
    const naive = Math.max(...satellites.map((s) => s.body.orbit.radius))
    expect(envelopeRadius(satellites)).toBeGreaterThan(naive)
  })
})
