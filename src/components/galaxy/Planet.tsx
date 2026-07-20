import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { Vector3, type Mesh } from 'three'

import { useOrbitalMotion } from '@/hooks/useOrbitalMotion'
import type { CelestialBody } from '@/types'

import { Moon } from './Moon'
import { OrbitRing } from './OrbitRing'
import { SelectionHalo } from './SelectionHalo'

/** Scratch vector reused every frame — allocating in useFrame causes GC churn. */
const scratchScale = new Vector3()

export interface CelestialProps {
  body: CelestialBody
  selected?: boolean
  dimmed?: boolean
  onSelect?: (body: CelestialBody) => void
  onOpen?: (body: CelestialBody) => void
  onHover?: (body: CelestialBody | null) => void
}

/** A folder, rendered as an orbiting planet with its own satellites. */
export function Planet({
  body,
  selected = false,
  dimmed = false,
  onSelect,
  onOpen,
  onHover,
}: CelestialProps) {
  const groupRef = useOrbitalMotion(body.orbit)
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.15
    // Ease towards the hover scale rather than snapping.
    const target = hovered || selected ? 1.18 : 1
    meshRef.current.scale.lerp(scratchScale.setScalar(target), Math.min(delta * 8, 1))
  })

  const handleHover = (isHovered: boolean) => {
    setHovered(isHovered)
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

        <Html
          center
          distanceFactor={26}
          position={[0, -body.radius - 1.1, 0]}
          className="pointer-events-none select-none"
          zIndexRange={[20, 0]}
        >
          <span
            className="font-sans text-[13px] tracking-[0.08em] whitespace-nowrap text-content/85"
            style={{ opacity: dimmed ? 0.25 : 1 }}
          >
            {body.label}
          </span>
        </Html>
      </group>
    </>
  )
}
