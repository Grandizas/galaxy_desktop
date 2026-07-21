/** Tunables for the 3D scene. Prefer editing these over touching components. */
export const GALAXY = {
  /** World units. */
  sunRadius: 3.2,
  planetRadiusRange: [0.9, 1.9] as const,
  moonRadiusRange: [0.22, 0.42] as const,
  firstOrbitRadius: 9,
  orbitSpacing: 5.5,
  moonOrbitPadding: 1.4,
  /** Radians per second at the innermost orbit. */
  baseOrbitSpeed: 0.08,
  maxInclination: 0.18,
  /**
   * Render budget per system. One mesh per body today, so a directory like
   * C:\Windows\System32 (~5000 entries) would stall the frame. Raised once
   * instanced rendering lands.
   */
  maxPlanets: 120,
  maxMoons: 180,
} as const

export const CAMERA = {
  fov: 55,
  near: 0.1,
  far: 4000,
  initialPosition: [0, 22, 46] as const,
  minDistance: 8,
  maxDistance: 160,
  /** Amplitude/period of the idle cinematic drift. */
  driftAmplitude: 1.6,
  driftPeriod: 24,
} as const

export const STARFIELD = {
  radius: 900,
  depth: 700,
  sizeRange: [0.6, 2.2] as const,
  twinkleSpeed: 0.35,
  rotationSpeed: 0.005,
} as const

/** Route paths — always reference these instead of string literals. */
export const ROUTES = {
  galaxy: '/',
  settings: '/settings',
  about: '/about',
  debug: '/debug',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
