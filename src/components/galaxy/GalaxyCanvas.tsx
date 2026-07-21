import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { ACESFilmicToneMapping } from 'three'

import { CAMERA } from '@/lib/constants'
import { palette } from '@/styles/theme'
import { useSelectionStore } from '@/store/selectionStore'

import { GalaxyScene } from './GalaxyScene'
import { Nebula } from './Nebula'
import { WarpFlash } from './WarpFlash'

/**
 * Owns the WebGL context and everything that must sit outside the scene graph:
 * DPR clamping, tone mapping, and the CSS nebula that sits behind the canvas.
 * Resizing is handled by R3F's internal ResizeObserver.
 */
export function GalaxyCanvas() {
  const clearSelection = useSelectionStore((state) => state.clear)

  return (
    <div className="absolute inset-0 bg-background">
      <Canvas
        // Cap DPR: 4K screens otherwise render 4x the pixels for no visual gain.
        dpr={[1, 2]}
        camera={{
          fov: CAMERA.fov,
          near: CAMERA.near,
          far: CAMERA.far,
          position: [...CAMERA.initialPosition],
        }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
        }}
        onPointerMissed={() => clearSelection()}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={[palette.background]} />
        <fog attach="fog" args={[palette.background, 120, 620]} />

        <Suspense fallback={null}>
          <GalaxyScene />
        </Suspense>
      </Canvas>

      {/* Drawn over the render target so the clouds tint the whole scene. */}
      <Nebula />
      <WarpFlash />
    </div>
  )
}
