import { WARP } from '@/lib/constants'
import { useCameraStore } from '@/store/cameraStore'

/**
 * Radial white-out that peaks as the camera reaches the folder, hiding the cut
 * between one system and the next. Purely decorative and never interactive.
 */
export function WarpFlash() {
  const warpPhase = useCameraStore((state) => state.warpPhase)
  const visible = warpPhase !== 'idle'

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[15]"
      style={{
        background:
          'radial-gradient(circle at 50% 50%, rgba(186,230,253,0) 20%, rgba(186,230,253,0.25) 70%, rgba(255,255,255,0.55))',
        opacity: visible ? 1 : 0,
        transition: `opacity ${warpPhase === 'dive' ? WARP.diveMs : WARP.flashMs}ms ease-${
          warpPhase === 'dive' ? 'in' : 'out'
        }`,
      }}
    />
  )
}
