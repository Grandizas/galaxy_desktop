import { create } from 'zustand'

export type Vec3 = readonly [number, number, number]

/**
 * `dive`   — accelerating towards the folder being entered
 * `emerge` — the new system materialising around the camera
 */
export type WarpPhase = 'idle' | 'dive' | 'emerge'

interface CameraState {
  warpPhase: WarpPhase
  /** Bumped on every arrival so bodies can replay their entrance. */
  arrivalId: number

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
  beginDive: (position: Vec3, target: Vec3) => void
  /** Snaps the camera back out and replays the entrance animations. */
  arrive: () => void
  endWarp: () => void
  setTransitioning: (value: boolean) => void
  setDriftEnabled: (value: boolean) => void
  setAutoRotate: (value: boolean) => void
}

const DEFAULT_POSITION: Vec3 = [0, 22, 46]
const DEFAULT_TARGET: Vec3 = [0, 0, 0]

/** Where the camera waits while a new system materialises — pulled back and high. */
const ARRIVAL_POSITION: Vec3 = [0, 34, 68]

export const useCameraStore = create<CameraState & CameraActions>((set) => ({
  target: DEFAULT_TARGET,
  position: DEFAULT_POSITION,
  isTransitioning: false,
  driftEnabled: true,
  autoRotate: false,
  warpPhase: 'idle',
  arrivalId: 0,

  focusOn: (position, target = DEFAULT_TARGET) =>
    set({ position, target, isTransitioning: true, driftEnabled: false }),

  // Clears `warpPhase` too: this is the "get me back to normal" action, and
  // leaving a phase set would strand the white-out overlay on screen.
  resetView: () =>
    set({
      position: DEFAULT_POSITION,
      target: DEFAULT_TARGET,
      isTransitioning: true,
      driftEnabled: true,
      warpPhase: 'idle',
    }),

  beginDive: (position, target) =>
    set({ position, target, isTransitioning: true, driftEnabled: false, warpPhase: 'dive' }),

  arrive: () =>
    set((state) => ({
      position: ARRIVAL_POSITION,
      target: DEFAULT_TARGET,
      isTransitioning: true,
      driftEnabled: false,
      warpPhase: 'emerge',
      arrivalId: state.arrivalId + 1,
    })),

  endWarp: () => set({ warpPhase: 'idle', driftEnabled: true }),

  setTransitioning: (isTransitioning) => set({ isTransitioning }),
  setDriftEnabled: (driftEnabled) => set({ driftEnabled }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
}))
