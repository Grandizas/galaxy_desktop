import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, type Mesh } from 'three'

import { GALAXY } from '@/lib/constants'
import { createGlowTexture } from '@/lib/three/textures'
import { celestial } from '@/styles/theme'

interface SunProps {
  radius?: number
  /** Breathing speed of the corona. */
  pulseSpeed?: number
}

/** The star at the centre of a system — represents the current directory. */
export function Sun({ radius = GALAXY.sunRadius, pulseSpeed = 0.6 }: SunProps) {
  const coreRef = useRef<Mesh>(null)
  const glow = useMemo(() => createGlowTexture(), [])

  useFrame(({ clock }) => {
    if (!coreRef.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * pulseSpeed) * 0.02
    coreRef.current.scale.setScalar(pulse)
  })

  return (
    <group>
      <mesh ref={coreRef}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshBasicMaterial color={celestial.starCore} toneMapped={false} />
      </mesh>

      {/* Corona — a billboarded sprite reads better than a translucent sphere. */}
      <Billboard>
        <mesh>
          <planeGeometry args={[radius * 9, radius * 9]} />
          <meshBasicMaterial
            map={glow}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </Billboard>

      {/* The system's key light. */}
      <pointLight color={celestial.starCorona} intensity={420} distance={400} decay={2} />
    </group>
  )
}
