import type { EntryKind } from './filesystem'

/** How a file system entry is represented in the galaxy. */
export type BodyType = 'star' | 'planet' | 'moon' | 'asteroid' | 'satellite'

export interface OrbitParams {
  /** Distance from the system centre, in world units. */
  readonly radius: number
  /** Starting angle in radians. */
  readonly phase: number
  /** Radians per second. */
  readonly speed: number
  /** Orbital plane tilt in radians. */
  readonly inclination: number
}

/**
 * A file system entry projected into 3D space.
 * Produced by `features/filesystem` mappers, consumed by `components/galaxy`.
 */
export interface CelestialBody {
  readonly id: string
  readonly label: string
  readonly type: BodyType
  readonly kind: EntryKind
  readonly radius: number
  readonly color: string
  readonly emissive: number
  readonly orbit: OrbitParams
  /** Bodies orbiting this body (e.g. files around a folder-planet). */
  readonly satellites?: readonly CelestialBody[]
}

export interface GalaxySystem {
  /** Path of the directory this system represents. */
  readonly path: string
  readonly label: string
  readonly bodies: readonly CelestialBody[]
}
