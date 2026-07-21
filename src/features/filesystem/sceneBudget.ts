import { GALAXY } from '@/lib/constants'
import type { GalaxySystem } from '@/types'

/**
 * Draw calls a system costs, counted from its composition.
 *
 * Roughly one per mesh: three.js batches nothing by default, so every planet,
 * ring, moon and satellite is its own call. This is measurable without a GPU,
 * which is the point — it makes the cost of a change visible in a unit test
 * instead of only in a frame counter.
 */
export function estimateDrawCalls(system: GalaxySystem, instanced = true): number {
  const planets = system.bodies.filter((body) => body.type === 'planet')
  const moons = system.bodies.filter((body) => body.type !== 'planet')
  const satellites = planets.reduce((total, planet) => total + (planet.satellites?.length ?? 0), 0)

  // Fixed cost: sun core + corona, two starfield layers, dust.
  const scenery = 5

  if (!instanced) {
    return scenery + planets.length * 2 + moons.length + satellites
  }

  // Moons and satellites collapse into one instanced mesh; so do orbit rings.
  const moonDraws = moons.length + satellites > 0 ? 1 : 0
  const ringDraws = planets.length > 0 ? 1 : 0
  return scenery + planets.length + ringDraws + moonDraws
}

/** Bodies a full system can hold before the render budget truncates it. */
export const MAX_BODIES = GALAXY.maxPlanets + GALAXY.maxMoons
