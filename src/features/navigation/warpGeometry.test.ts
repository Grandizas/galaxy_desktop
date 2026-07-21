import { describe, expect, it } from 'vitest'

import { WARP } from '@/lib/constants'
import type { Vec3 } from '@/store/cameraStore'

import { computeDivePosition, staggerDelay } from './warpGeometry'

const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

describe('computeDivePosition', () => {
  const camera: Vec3 = [0, 22, 46]

  it('moves the camera most of the way towards the body', () => {
    const body: Vec3 = [20, 0, 0]
    const result = computeDivePosition(camera, body)

    const before = distance(camera, body)
    const after = distance(result, body)

    expect(after).toBeLessThan(before)
    expect(after).toBeCloseTo(before * (1 - WARP.diveApproach), 5)
  })

  it('never passes through the body', () => {
    // Overshooting would flip the view inside out at the moment of the cut.
    const bodies: Vec3[] = [
      [20, 0, 0],
      [-35, 4, -12],
      [0, 0, 0],
      [0, 100, 0],
    ]

    for (const body of bodies) {
      const result = computeDivePosition(camera, body)
      const toBody: Vec3 = [body[0] - camera[0], body[1] - camera[1], body[2] - camera[2]]
      const toResult: Vec3 = [result[0] - camera[0], result[1] - camera[1], result[2] - camera[2]]

      // Same direction, and no further than the body itself.
      const dot = toBody[0] * toResult[0] + toBody[1] * toResult[1] + toBody[2] * toResult[2]
      expect(dot).toBeGreaterThanOrEqual(0)
      expect(Math.hypot(...toResult)).toBeLessThanOrEqual(Math.hypot(...toBody) + 1e-9)
    }
  })

  it('is a no-op when the camera already sits on the body', () => {
    expect(computeDivePosition(camera, camera)).toEqual(camera)
  })
})

describe('staggerDelay', () => {
  it('increases with index', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(3)).toBe(3 * WARP.staggerMs)
  })

  it('caps so a large system never crawls in', () => {
    // 300 bodies at 28ms each would be 8.4 seconds without the cap.
    expect(staggerDelay(300)).toBe(900)
    expect(staggerDelay(300, 500)).toBe(500)
  })
})
