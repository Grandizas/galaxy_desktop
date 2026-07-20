/**
 * Deterministic hashing so a given path always yields the same planet colour,
 * size and orbit — the galaxy must not reshuffle itself between renders.
 */

export function hashString(input: string): number {
  let hash = 7
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Stable pseudo-random number in [0, 1) derived from a string. */
export const hashUnit = (input: string) => hashString(input) / 0xffffffff

/** Stable pick from a list. */
export const hashPick = <T>(input: string, items: readonly T[]): T =>
  items[hashString(input) % items.length]!
