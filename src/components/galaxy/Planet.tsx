import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Vector3, type Group, type Mesh } from 'three'

import { useMaterialize } from '@/hooks/useMaterialize'
import { useOrbitalMotion } from '@/hooks/useOrbitalMotion'
import type { CelestialBody } from '@/types'

import { BodyLabel } from './BodyLabel'
import { SelectionHalo } from './SelectionHalo'

/** Scratch vector reused every frame — allocating in useFrame causes GC churn. */
const scratchScale = new Vector3()

export interface CelestialProps {
  body: CelestialBody
  selected?: boolean
  hovered?: boolean
  dimmed?: boolean
  /** Position in the system, used to stagger the entrance animation. */
  index?: number
  /** Dense systems label on hover only — see GALAXY.labelLimit. */
  showLabel?: boolean
  /** `additive` is a Ctrl-click: toggle rather than replace the selection. */
  onSelect?: (body: CelestialBody, additive: boolean) => void
  /** Receives the body's current world position so the camera can fly to it. */
  onOpen?: (body: CelestialBody, worldPosition: Vector3) => void
  onHover?: (body: CelestialBody | null) => void
  onContextMenu?: (body: CelestialBody, screen: { x: number; y: number }) => void
}

/** A folder, rendered as an orbiting planet with its own satellites. */
export function Planet({
  body,
  selected = false,
  hovered = false,
  dimmed = false,
  index = 0,
  showLabel = true,
  onSelect,
  onOpen,
  onHover,
  onContextMenu,
}: CelestialProps) {
  const groupRef = useOrbitalMotion(body.orbit)
  const materializeRef = useMaterialize<Group>(index)
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

  // The orbit path is drawn by <OrbitRings>, which instances every ring in the
  // system into a single mesh.
  return (
    <>
      <group ref={groupRef}>
        {/* Separate group: orbital motion owns position, this owns entrance scale. */}
        <group ref={materializeRef}>
          <mesh
            ref={meshRef}
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.(body, event.ctrlKey || event.metaKey)
            }}
            onContextMenu={(event) => {
              event.stopPropagation()
              onContextMenu?.(body, { x: event.clientX, y: event.clientY })
            }}
            onDoubleClick={(event) => {
              event.stopPropagation()
              // Planets orbit, so the camera needs where it is *now*.
              onOpen?.(body, groupRef.current!.getWorldPosition(new Vector3()))
            }}
            onPointerOver={(event) => {
              event.stopPropagation()
              handleHover(true)
            }}
            onPointerOut={() => handleHover(false)}
          >
            {/* 32 segments, not 48: at these radii the silhouette is identical
                and it costs less than half the triangles. */}
            <sphereGeometry args={[body.radius, 32, 24]} />
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

          {/* Satellites are drawn by <MoonField> in the shared instanced mesh. */}

          {(showLabel || hovered || selected) && (
            <BodyLabel
              label={body.label}
              meta={body.meta}
              offset={body.radius + 1.1}
              detailed={hovered}
              dimmed={dimmed}
            />
          )}
        </group>
      </group>
    </>
  )
}
