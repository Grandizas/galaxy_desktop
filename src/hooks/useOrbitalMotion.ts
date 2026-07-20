import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'

import type { OrbitParams } from '@/types'

/**
 * Drives a group around an elliptical, slightly inclined orbit.
 * Position is derived from the clock, so bodies never drift out of sync.
 */
export function useOrbitalMotion(orbit: OrbitParams, enabled = true) {
  const ref = useRef<Group>(null)

  useFrame(({ clock }) => {
    const group = ref.current
    if (!group) return

    const angle = enabled ? orbit.phase + clock.elapsedTime * orbit.speed : orbit.phase
    group.position.set(
      Math.cos(angle) * orbit.radius,
      Math.sin(angle) * orbit.radius * Math.sin(orbit.inclination),
      Math.sin(angle) * orbit.radius,
    )
  })

  return ref
}
