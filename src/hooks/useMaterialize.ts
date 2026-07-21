import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Object3D } from 'three'

import { WARP } from '@/lib/constants'
import { staggerDelay } from '@/features/navigation/warpGeometry'
import { useCameraStore } from '@/store/cameraStore'
import { useUiStore } from '@/store/uiStore'

const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

/**
 * Scales a body up from nothing when a system is entered, staggered by index so
 * the galaxy assembles itself rather than appearing all at once.
 *
 * Driven by a ref and `useFrame` instead of React state — a hundred bodies
 * re-rendering every frame would cost far more than the animation is worth.
 */
export function useMaterialize<T extends Object3D>(index: number, scale = 1) {
  const ref = useRef<T>(null)
  const startedAt = useRef<number | null>(null)
  const arrivalId = useCameraStore((state) => state.arrivalId)
  const reducedMotion = useUiStore((state) => state.reducedMotion)

  // Replay whenever a new system is entered.
  useEffect(() => {
    startedAt.current = null
  }, [arrivalId])

  useFrame(({ clock }) => {
    const object = ref.current
    if (!object) return

    if (reducedMotion) {
      object.scale.setScalar(scale)
      return
    }

    const now = clock.elapsedTime * 1000
    if (startedAt.current === null) {
      startedAt.current = now + staggerDelay(index)
      object.scale.setScalar(0)
      return
    }

    const elapsed = now - startedAt.current
    if (elapsed < 0) return
    if (elapsed >= WARP.emergeMs) {
      object.scale.setScalar(scale)
      return
    }

    object.scale.setScalar(easeOutBack(elapsed / WARP.emergeMs) * scale)
  })

  return ref
}
