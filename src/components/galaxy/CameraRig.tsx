import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, type ComponentRef } from 'react'
import { Vector3 } from 'three'

import { CAMERA } from '@/lib/constants'
import { useCameraStore } from '@/store/cameraStore'

const desiredPosition = new Vector3()
const desiredTarget = new Vector3()

/**
 * Owns the camera: user orbiting, cinematic transitions towards a focused
 * body, and the idle drift that keeps the scene from feeling static.
 */
export function CameraRig() {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((state) => state.camera)

  const position = useCameraStore((state) => state.position)
  const target = useCameraStore((state) => state.target)
  const isTransitioning = useCameraStore((state) => state.isTransitioning)
  const driftEnabled = useCameraStore((state) => state.driftEnabled)
  const autoRotate = useCameraStore((state) => state.autoRotate)
  const setTransitioning = useCameraStore((state) => state.setTransitioning)

  useFrame(({ clock }, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    if (isTransitioning) {
      desiredPosition.set(...position)
      desiredTarget.set(...target)

      const ease = Math.min(delta * 2.4, 1)
      camera.position.lerp(desiredPosition, ease)
      controls.target.lerp(desiredTarget, ease)

      if (camera.position.distanceTo(desiredPosition) < 0.35) {
        camera.position.copy(desiredPosition)
        controls.target.copy(desiredTarget)
        setTransitioning(false)
      }
    } else if (driftEnabled) {
      // Barely-there sway; enough to read as "alive" without inducing nausea.
      const t = (clock.elapsedTime * Math.PI * 2) / CAMERA.driftPeriod
      controls.target.y = target[1] + Math.sin(t) * CAMERA.driftAmplitude * 0.35
      camera.position.y += Math.cos(t) * CAMERA.driftAmplitude * delta * 0.4
    }

    controls.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      enablePan={false}
      autoRotate={autoRotate}
      autoRotateSpeed={0.25}
      minDistance={CAMERA.minDistance}
      maxDistance={CAMERA.maxDistance}
      maxPolarAngle={Math.PI * 0.85}
      minPolarAngle={Math.PI * 0.08}
    />
  )
}
