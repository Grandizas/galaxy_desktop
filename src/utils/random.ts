/**
 * Small seeded PRNG (mulberry32).
 *
 * The scene must be reproducible: with a fixed seed the starfield, dust and
 * orbits are identical on every render and across sessions, which also keeps
 * the components pure.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
