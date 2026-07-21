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
   * Render budget per system.
   *
   * Files are instanced, so their cost is geometry rather than draw calls and
   * the ceiling is high. Planets remain individual meshes with their own label
   * and animation, so their budget stays comparatively tight.
   */
  maxPlanets: 220,
  maxMoons: 2500,

  /**
   * Above this many planets, labels are shown only for the hovered or selected
   * body. Two hundred overlapping captions are unreadable as well as expensive.
   */
  labelLimit: 60,
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

/**
 * Timings for the flight between folders, in milliseconds.
 * The phases overlap deliberately: the flash peaks while the camera is still
 * accelerating, so the cut to the new system is hidden inside the glare.
 */
export const WARP = {
  /** Camera accelerates towards the target planet. */
  diveMs: 620,
  /** White-out holds while the new directory loads. */
  flashMs: 260,
  /** Bodies materialise on arrival, staggered by index. */
  emergeMs: 700,
  staggerMs: 28,
  /** How close the camera gets to the target, as a fraction of the distance. */
  diveApproach: 0.82,
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
