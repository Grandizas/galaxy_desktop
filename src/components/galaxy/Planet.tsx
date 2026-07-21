import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3, type Mesh } from 'three'

import { useOrbitalMotion } from '@/hooks/useOrbitalMotion'
import type { CelestialBody } from '@/types'

import { BodyLabel } from './BodyLabel'
import { Moon } from './Moon'
import { OrbitRing } from './OrbitRing'
import { SelectionHalo } from './SelectionHalo'

/** Scratch vector reused every frame — allocating in useFrame causes GC churn. */
const scratchScale = new Vector3()

export interface CelestialProps {
  body: CelestialBody
  selected?: boolean
  hovered?: boolean
  dimmed?: boolean
  onSelect?: (body: CelestialBody) => void
  onOpen?: (body: CelestialBody) => void
  onHover?: (body: CelestialBody | null) => void
}

/** A folder, rendered as an orbiting planet with its own satellites. */
export function Planet({
  body,
  selected = false,
  hovered = false,
  dimmed = false,
  onSelect,
  onOpen,
  onHover,
}: CelestialProps) {
  const groupRef = useOrbitalMotion(body.orbit)
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.15
    // Ease towards the hover scale rather than snapping.
    const target = hovered || selected ? 1.18 : 1
    meshRef.current.scale.lerp(scratchScale.setScalar(target), Math.min(delta * 8, 1))
  })

  const handleHover = (isHovered: boolean) => {
    document.body.style.cursor = isHovered ? 'pointer' : 'default'
    onHover?.(isHovered ? body : null)
  }

  return (
    <>
      <OrbitRing
        radius={body.orbit.radius}
        inclination={body.orbit.inclination}
        color={body.color}
        opacity={selected ? 0.35 : 0.1}
      />

      <group ref={groupRef}>
        <mesh
          ref={meshRef}
          onClick={(event) => {
            event.stopPropagation()
            onSelect?.(body)
          }}
          onDoubleClick={(event) => {
            event.stopPropagation()
            onOpen?.(body)
          }}
          onPointerOver={(event) => {
            event.stopPropagation()
            handleHover(true)
          }}
          onPointerOut={() => handleHover(false)}
        >
          <sphereGeometry args={[body.radius, 48, 48]} />
          <meshStandardMaterial
            color={body.color}
            emissive={body.color}
            emissiveIntensity={dimmed ? 0.05 : body.emissive}
            roughness={0.55}
            metalness={0.15}
            transparent
            opacity={dimmed ? 0.25 : 1}
          />
        </mesh>

        {selected && <SelectionHalo radius={body.radius * 1.8} />}

        {body.satellites?.map((satellite) => (
          <Moon key={satellite.id} body={satellite} dimmed={dimmed} />
        ))}

        <BodyLabel
          label={body.label}
          meta={body.meta}
          offset={body.radius + 1.1}
          detailed={hovered}
          dimmed={dimmed}
        />
      </group>
    </>
  )
}
