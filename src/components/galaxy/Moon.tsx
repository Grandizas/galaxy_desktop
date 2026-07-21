import { Vector3, type Group } from 'three'

import { useMaterialize } from '@/hooks/useMaterialize'
import { useOrbitalMotion } from '@/hooks/useOrbitalMotion'

import { BodyLabel } from './BodyLabel'
import type { CelestialProps } from './Planet'
import { SelectionHalo } from './SelectionHalo'

/**
 * A file, rendered as a small emissive body. Used both for loose files
 * orbiting the star and for satellites around a folder-planet.
 */
export function Moon({
  body,
  selected = false,
  hovered = false,
  dimmed = false,
  index = 0,
  onSelect,
  onOpen,
  onHover,
  onContextMenu,
}: CelestialProps) {
  const groupRef = useOrbitalMotion(body.orbit)
  const materializeRef = useMaterialize<Group>(index)
  const interactive = Boolean(onSelect || onOpen || onHover)

  return (
    <group ref={groupRef}>
      <group ref={materializeRef}>
        <mesh
          onClick={
            interactive
              ? (event) => {
                  event.stopPropagation()
                  onSelect?.(body, event.ctrlKey || event.metaKey)
                }
              : undefined
          }
          onContextMenu={
            interactive
              ? (event) => {
                  event.stopPropagation()
                  onContextMenu?.(body, { x: event.clientX, y: event.clientY })
                }
              : undefined
          }
          onDoubleClick={
            interactive
              ? (event) => {
                  event.stopPropagation()
                  onOpen?.(body, groupRef.current!.getWorldPosition(new Vector3()))
                }
              : undefined
          }
          onPointerOver={
            interactive
              ? (event) => {
                  event.stopPropagation()
                  document.body.style.cursor = 'pointer'
                  onHover?.(body)
                }
              : undefined
          }
          onPointerOut={
            interactive
              ? () => {
                  document.body.style.cursor = 'default'
                  onHover?.(null)
                }
              : undefined
          }
        >
          <sphereGeometry args={[body.radius, 24, 24]} />
          <meshStandardMaterial
            color={body.color}
            emissive={body.color}
            emissiveIntensity={dimmed ? 0.05 : body.emissive}
            roughness={0.4}
            transparent
            opacity={dimmed ? 0.2 : 1}
          />
        </mesh>

        {selected && <SelectionHalo radius={body.radius * 2.6} />}

        {/* Files are too dense to label at rest — reveal on hover or selection. */}
        {(hovered || selected) && body.label && (
          <BodyLabel
            label={body.label}
            meta={body.meta}
            offset={body.radius + 0.7}
            detailed={hovered}
          />
        )}
      </group>
    </group>
  )
}
