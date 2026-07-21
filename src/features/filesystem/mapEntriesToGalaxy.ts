import { ENTRY_KIND_LABEL } from '@/lib/classify'
import { GALAXY } from '@/lib/constants'
import { formatBytes, formatCount } from '@/utils/format'
import { planetPalette } from '@/styles/theme'
import type { CelestialBody, EntryKind, FsEntry, GalaxySystem } from '@/types'
import { hashPick, hashUnit } from '@/utils/hash'

/** Colour per file kind — moons read as "type" at a glance. */
const KIND_COLOR: Record<EntryKind, string> = {
  folder: '#7DD3FC',
  image: '#7DE8FF',
  video: '#A855F7',
  audio: '#F472B6',
  archive: '#94A3B8',
  app: '#EF4444',
  code: '#60A5FA',
  doc: '#E2E8F0',
}

const lerp = (min: number, max: number, t: number) => min + (max - min) * t

/** ~137.5°, the angle that never repeats — sunflower-seed packing. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/**
 * Orbit radius grows with the square root of the index, so a system stays
 * legible whether it holds three folders or a hundred. Linear growth pushed the
 * outermost planet of a large directory ~660 units out — far past the camera's
 * useful range, and the reason big folders trailed off into the distance.
 */
const orbitRadiusFor = (index: number) =>
  GALAXY.firstOrbitRadius + GALAXY.orbitSpacing * Math.sqrt(index) * 1.6

/**
 * Projects a directory listing into the 3D scene graph.
 *
 * Pure and deterministic: the same path always produces the same layout, so
 * planets stay put across re-renders and navigation.
 */
export function mapEntriesToGalaxy(
  path: string,
  label: string,
  entries: readonly FsEntry[],
  limits: { maxPlanets?: number; maxMoons?: number } = {},
): GalaxySystem {
  const maxPlanets = limits.maxPlanets ?? GALAXY.maxPlanets
  const maxMoons = limits.maxMoons ?? GALAXY.maxMoons

  const allFolders = entries.filter((entry) => entry.isDirectory)
  const allFiles = entries.filter((entry) => !entry.isDirectory)

  // A real system folder holds thousands of entries. Show the most relevant
  // ones — most recently touched first — and report the remainder rather than
  // silently pretending the directory is smaller than it is.
  const folders = allFolders.length > maxPlanets ? byRecency(allFolders, maxPlanets) : allFolders
  const files = allFiles.length > maxMoons ? byRecency(allFiles, maxMoons) : allFiles
  const hiddenCount = allFolders.length - folders.length + (allFiles.length - files.length)

  const planets = folders.map((folder, index) => {
    const seed = hashUnit(folder.path)
    const radius = lerp(...GALAXY.planetRadiusRange, seed)
    const orbitRadius = orbitRadiusFor(index)

    return {
      id: folder.path,
      label: folder.name,
      meta:
        folder.childCount === undefined
          ? 'Folder'
          : `Folder · ${formatCount(folder.childCount, 'item')}`,
      type: 'planet',
      kind: folder.kind,
      radius,
      color: hashPick(folder.path, planetPalette),
      emissive: 0.28,
      orbit: {
        radius: orbitRadius,
        // Golden angle by index, jittered by the hash. Structural spacing means
        // planets can never line up, whatever the names happen to hash to.
        phase: (index * GOLDEN_ANGLE + seed * 0.6) % (Math.PI * 2),
        speed: (GALAXY.baseOrbitSpeed * GALAXY.firstOrbitRadius) / orbitRadius,
        inclination: (seed - 0.5) * 2 * GALAXY.maxInclination,
      },
      satellites: buildMoons(folder.path, folder.childCount ?? 0, radius),
    } satisfies CelestialBody
  })

  // Loose files orbit the star itself, on tighter and more tilted paths.
  const moons = files.map((file, index) => {
    const seed = hashUnit(file.path)
    const orbitRadius = GALAXY.firstOrbitRadius * 0.45 + (index % 5) * 1.6 + seed * 1.2

    return {
      id: file.path,
      label: file.name,
      meta: `${ENTRY_KIND_LABEL[file.kind]} · ${formatBytes(file.size)}`,
      type: 'moon',
      kind: file.kind,
      radius: lerp(...GALAXY.moonRadiusRange, seed),
      color: KIND_COLOR[file.kind],
      emissive: 0.55,
      orbit: {
        radius: orbitRadius,
        phase: (index / Math.max(files.length, 1)) * Math.PI * 2,
        speed: (GALAXY.baseOrbitSpeed * GALAXY.firstOrbitRadius) / orbitRadius,
        inclination: (seed - 0.5) * 2 * GALAXY.maxInclination * 3,
      },
    } satisfies CelestialBody
  })

  return { path, label, bodies: [...planets, ...moons], hiddenCount }
}

/** Most recently modified first; undated entries sort last, name-ordered. */
function byRecency(entries: readonly FsEntry[], limit: number): FsEntry[] {
  return [...entries]
    .sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0) || a.name.localeCompare(b.name))
    .slice(0, limit)
}

/** Placeholder satellites hinting at a folder's contents before it is read. */
function buildMoons(parentPath: string, count: number, planetRadius: number): CelestialBody[] {
  return Array.from({ length: Math.min(count, 3) }, (_, index) => {
    const id = `${parentPath}#satellite-${index}`
    const seed = hashUnit(id)
    return {
      id,
      label: '',
      type: 'satellite',
      kind: 'doc',
      radius: planetRadius * 0.16,
      color: '#E2E8F0',
      emissive: 0.4,
      orbit: {
        radius: planetRadius + GALAXY.moonOrbitPadding + index * 0.5,
        phase: seed * Math.PI * 2,
        speed: 0.7 + seed * 0.5,
        inclination: (seed - 0.5) * 1.2,
      },
    } satisfies CelestialBody
  })
}

export { KIND_COLOR }
