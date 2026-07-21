import { create } from 'zustand'

export interface PerfSample {
  fps: number
  /** Milliseconds per frame, averaged over the sampling window. */
  frameMs: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  programs: number
  /** Bodies handed to the renderer this frame. */
  bodies: number
}

const EMPTY: PerfSample = {
  fps: 0,
  frameMs: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  programs: 0,
  bodies: 0,
}

interface PerfState extends PerfSample {
  /** Worst frame time seen since the last reset — averages hide stalls. */
  worstFrameMs: number
  report: (sample: PerfSample) => void
  reset: () => void
}

export const usePerfStore = create<PerfState>((set) => ({
  ...EMPTY,
  worstFrameMs: 0,

  report: (sample) =>
    set((state) => ({
      ...sample,
      worstFrameMs: Math.max(state.worstFrameMs, sample.frameMs),
    })),

  reset: () => set({ ...EMPTY, worstFrameMs: 0 }),
}))
