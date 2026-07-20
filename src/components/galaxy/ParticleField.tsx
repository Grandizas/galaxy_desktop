import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, type Points as ThreePoints } from 'three'

import { createSpriteTexture } from '@/lib/three/textures'
import { palette } from '@/styles/theme'
import { createRandom } from '@/utils/random'

interface ParticleFieldProps {
  count?: number
  /** Inner and outer radius of the dust ring. */
  innerRadius?: number
  outerRadius?: number
  color?: string
  /** Same seed ⇒ same dust distribution. */
  seed?: number
}

/**
 * Slow-drifting dust inside the system. Cheap stand-in for the GPU particle
 * effects planned for later — same props, different implementation.
 */
export function ParticleField({
  count = 900,
  innerRadius = 12,
  outerRadius = 60,
  color = palette.primarySoft,
  seed = 0xd0570,
}: ParticleFieldProps) {
  const ref = useRef<ThreePoints>(null)
  const sprite = useMemo(() => createSpriteTexture(), [])

  const positions = useMemo(() => {
    const random = createRandom(seed)
    const data = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2
      const radius = innerRadius + random() * (outerRadius - innerRadius)
      data[i * 3] = Math.cos(angle) * radius
      data[i * 3 + 1] = (random() - 0.5) * 6
      data[i * 3 + 2] = Math.sin(angle) * radius
    }
    return data
  }, [count, innerRadius, outerRadius, seed])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.012
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <primitive attach="attributes-position" object={new BufferAttribute(positions, 3)} />
      </bufferGeometry>
      <pointsMaterial
        size={0.35}
        map={sprite}
        color={color}
        transparent
        opacity={0.5}
        depthWrite={false}
        sizeAttenuation
        blending={AdditiveBlending}
      />
    </points>
  )
}
