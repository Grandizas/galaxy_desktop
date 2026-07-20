import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { AdditiveBlending, DoubleSide, type Mesh } from 'three'

import { palette } from '@/styles/theme'

interface SelectionHaloProps {
  radius: number
  color?: string
}

/** Pulsing ring drawn around the selected body. */
export function SelectionHalo({ radius, color = palette.accent }: SelectionHaloProps) {
  const ref = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.elapsedTime % 1.8) / 1.8
    ref.current.scale.setScalar(1 + t * 0.6)
    const material = ref.current.material as { opacity: number }
    material.opacity = 0.7 * (1 - t)
  })

  return (
    <Billboard>
      <mesh ref={ref}>
        <ringGeometry args={[radius, radius * 1.06, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          side={DoubleSide}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </Billboard>
  )
}
