import { create } from 'zustand'

export type Vec3 = readonly [number, number, number]

interface CameraState {
  /** Point the camera orbits — animated when zooming into a folder. */
  target: Vec3
  /** Desired camera position; the rig eases towards it every frame. */
  position: Vec3
  /** True while a cinematic transition is in flight (warp between folders). */
  isTransitioning: boolean
  /** Idle drift adds life to the scene; disabled during transitions. */
  driftEnabled: boolean
  autoRotate: boolean
}

interface CameraActions {
  focusOn: (position: Vec3, target?: Vec3) => void
  resetView: () => void
  setTransitioning: (value: boolean) => void
  setDriftEnabled: (value: boolean) => void
  setAutoRotate: (value: boolean) => void
}

const DEFAULT_POSITION: Vec3 = [0, 22, 46]
const DEFAULT_TARGET: Vec3 = [0, 0, 0]

export const useCameraStore = create<CameraState & CameraActions>((set) => ({
  target: DEFAULT_TARGET,
  position: DEFAULT_POSITION,
  isTransitioning: false,
  driftEnabled: true,
  autoRotate: false,

  focusOn: (position, target = DEFAULT_TARGET) =>
    set({ position, target, isTransitioning: true, driftEnabled: false }),

  resetView: () =>
    set({
      position: DEFAULT_POSITION,
      target: DEFAULT_TARGET,
      isTransitioning: true,
      driftEnabled: true,
    }),

  setTransitioning: (isTransitioning) => set({ isTransitioning }),
  setDriftEnabled: (driftEnabled) => set({ driftEnabled }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
}))
