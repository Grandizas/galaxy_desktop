import type { CelestialBody, OrbitParams } from '@/types'

export interface InstancedBody {
  body: CelestialBody
  /**
   * Orbit of the planet this body belongs to, for satellites. Their position is
   * relative to a planet that is itself moving, so both orbits are evaluated in
   * the same loop.
   */
  parent?: OrbitParams
}

/**
 * Resolves a pointer hit to a body the user can actually act on.
 *
 * Satellites are decorative placeholders standing in for a folder's unread
 * contents: they carry no label and a synthetic id (`…\Desktop#satellite-0`)
 * that matches no entry. Selecting one would target a path that does not exist,
 * so the inspector would show nothing and the hover card would be empty — which
 * reads as "the moons stopped working". Before instancing they were rendered
 * without handlers; sharing one mesh made every instance interactive by
 * default, so the distinction has to be restored explicitly.
 */
export function interactiveBodyAt(
  bodies: readonly InstancedBody[],
  instanceId: number | undefined,
): CelestialBody | undefined {
  if (instanceId === undefined) return undefined

  const body = bodies[instanceId]?.body
  return body?.type === 'satellite' ? undefined : body
}
