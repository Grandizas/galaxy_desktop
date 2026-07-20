import { useMemo } from 'react'
import { AdditiveBlending, DoubleSide } from 'three'

interface OrbitRingProps {
  radius: number
  /** Tilt of the orbital plane, in radians. */
  inclination?: number
  color?: string
  opacity?: number
}

/** Thin disc marking an orbital path. */
export function OrbitRing({
  radius,
  inclination = 0,
  color = '#7DD3FC',
  opacity = 0.12,
}: OrbitRingProps) {
  // A ring wide enough to survive anti-aliasing at grazing angles.
  const args = useMemo(() => [radius - 0.035, radius + 0.035, 160] as const, [radius])

  return (
    <mesh rotation={[-Math.PI / 2 + inclination, 0, 0]}>
      <ringGeometry args={args} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={DoubleSide}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}
