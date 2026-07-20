import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Points as ThreePoints } from 'three'
import { AdditiveBlending, BufferAttribute, Color } from 'three'

import { env } from '@/lib/env'
import { STARFIELD } from '@/lib/constants'
import { createSpriteTexture } from '@/lib/three/textures'
import { celestial } from '@/styles/theme'
import { createRandom } from '@/utils/random'

interface StarsProps {
  /** Defaults to VITE_STAR_COUNT. */
  count?: number
  radius?: number
  /** Multiplier on rotation speed — the two layers use different values. */
  speed?: number
  tint?: string
  /** Same seed ⇒ same sky, every session. */
  seed?: number
}

/**
 * A shell of points around the origin. Two instances at different radii give
 * the parallax that makes the sky feel deep.
 */
export function Stars({
  count = env.starCount,
  radius = STARFIELD.radius,
  speed = 1,
  tint = celestial.starfield,
  seed = 0x5eed,
}: StarsProps) {
  const pointsRef = useRef<ThreePoints>(null)
  const sprite = useMemo(() => createSpriteTexture(), [])

  const { positions, colors, sizes } = useMemo(() => {
    const random = createRandom(seed)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const color = new Color()

    for (let i = 0; i < count; i++) {
      // Uniform distribution on a sphere shell, thickened by `depth`.
      const theta = random() * Math.PI * 2
      const phi = Math.acos(2 * random() - 1)
      const r = radius + (random() - 0.5) * STARFIELD.depth

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.6
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      // Slight hue variation keeps the field from looking printed.
      color.set(tint).offsetHSL((random() - 0.5) * 0.08, 0, (random() - 0.5) * 0.3)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] =
        STARFIELD.sizeRange[0] + random() * (STARFIELD.sizeRange[1] - STARFIELD.sizeRange[0])
    }

    return { positions, colors, sizes }
  }, [count, radius, tint, seed])

  useFrame((_, delta) => {
    const points = pointsRef.current
    if (!points) return
    points.rotation.y += delta * STARFIELD.rotationSpeed * speed
    points.rotation.x += delta * STARFIELD.rotationSpeed * speed * 0.25
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <primitive attach="attributes-position" object={new BufferAttribute(positions, 3)} />
        <primitive attach="attributes-color" object={new BufferAttribute(colors, 3)} />
        <primitive attach="attributes-size" object={new BufferAttribute(sizes, 1)} />
      </bufferGeometry>
      <pointsMaterial
        size={2.4}
        map={sprite}
        vertexColors
        transparent
        depthWrite={false}
        sizeAttenuation
        blending={AdditiveBlending}
      />
    </points>
  )
}
