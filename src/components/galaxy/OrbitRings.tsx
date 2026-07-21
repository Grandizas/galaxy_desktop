import { useEffect, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from 'three'

import type { CelestialBody } from '@/types'

interface OrbitRingsProps {
  planets: readonly CelestialBody[]
  selected: ReadonlySet<string>
}

const matrix = new Matrix4()
const position = new Vector3(0, 0, 0)
const quaternion = new Quaternion()
const euler = new Euler()
const scale = new Vector3()
const color = new Color()

/**
 * All orbit paths in one instanced mesh.
 *
 * The rings never move, so the matrices are written once per system rather than
 * per frame. A unit-radius ring is scaled per instance, which is why the
 * geometry below is built at radius 1.
 */
export function OrbitRings({ planets, selected }: OrbitRingsProps) {
  const meshRef = useRef<InstancedMesh>(null)

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    planets.forEach((planet, index) => {
      euler.set(-Math.PI / 2 + planet.orbit.inclination, 0, 0)
      quaternion.setFromEuler(euler)
      scale.setScalar(planet.orbit.radius)

      mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale))
      color.set(planet.color).multiplyScalar(selected.has(planet.id) ? 3 : 1)
      mesh.setColorAt(index, color)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [planets, selected])

  if (planets.length === 0) return null

  // Additive blending means overlapping rings accumulate; without this a dense
  // system turns into a bright rainbow mesh that buries the bodies.
  const opacity = Math.max(0.03, Math.min(0.12, (0.12 * 60) / Math.max(planets.length, 60)))

  return (
    <instancedMesh
      ref={meshRef}
      key={planets.length}
      args={[undefined, undefined, planets.length]}
      frustumCulled={false}
      // Rings are decoration; clicks must reach the bodies behind them.
      raycast={() => null}
    >
      {/* Unit radius, thin enough to survive anti-aliasing at grazing angles. */}
      <ringGeometry args={[0.997, 1.003, 128]} />
      <meshBasicMaterial
        transparent
        opacity={opacity}
        side={DoubleSide}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </instancedMesh>
  )
}
