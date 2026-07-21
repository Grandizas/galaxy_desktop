import { WARP } from '@/lib/constants'
import type { Vec3 } from '@/store/cameraStore'

/**
 * Where the camera should end up when diving into a body.
 *
 * Kept pure and separate from the animation so it can be reasoned about and
 * tested: the camera must approach the target without ever passing through it,
 * which would flip the view inside out at the moment of the cut.
 */
export function computeDivePosition(camera: Vec3, body: Vec3): Vec3 {
  const delta: Vec3 = [body[0] - camera[0], body[1] - camera[1], body[2] - camera[2]]
  const distance = Math.hypot(...delta)

  // Degenerate case: camera already sits on the body.
  if (distance < 1e-4) return camera

  const t = WARP.diveApproach
  return [camera[0] + delta[0] * t, camera[1] + delta[1] * t, camera[2] + delta[2] * t]
}

/** Entrance delay for the nth body, capped so a full system never crawls in. */
export function staggerDelay(index: number, maxMs = 900): number {
  return Math.min(index * WARP.staggerMs, maxMs)
}
