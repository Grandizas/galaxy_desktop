import { create } from 'zustand'

export interface PerfSample {
  fps: number
  /**
   * Worst frame time within the sampling window, in milliseconds — the peak,
   * not the mean. A single 200 ms stall is what the user feels; an average
   * hides it behind the good frames either side.
   */
  frameMs: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  programs: number
  /** Bodies handed to the renderer this frame, satellites included. */
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
