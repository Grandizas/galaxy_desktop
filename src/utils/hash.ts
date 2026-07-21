/**
 * Deterministic hashing so a given path always yields the same planet colour,
 * size and orbit — the galaxy must not reshuffle itself between renders.
 */

export function hashString(input: string): number {
  let hash = 7
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return mix32(hash)
}

/**
 * Avalanche step (murmur3 finaliser): flipping one input bit changes about
 * half the output bits.
 *
 * Without it, a plain polynomial hash maps similar strings to adjacent values —
 * and a directory like System32, full of near-identical names (`ms-MY`,
 * `ms-MT`, `nl-NL`…), collapsed into one angle: every planet sat on the same
 * bearing at a growing radius, drawing a straight line into the distance.
 */
function mix32(value: number): number {
  let h = value >>> 0
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return h >>> 0
}

/** Stable pseudo-random number in [0, 1) derived from a string. */
export const hashUnit = (input: string) => hashString(input) / 0x100000000

/** Stable pick from a list. */
export const hashPick = <T>(input: string, items: readonly T[]): T =>
  items[hashString(input) % items.length]!
