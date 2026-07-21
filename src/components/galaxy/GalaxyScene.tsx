import { useCallback, useMemo } from 'react'
import type { Vector3 } from 'three'

import { useEntryActions } from '@/features/explorer/useEntryActions'
import { mapEntriesToGalaxy } from '@/features/filesystem/mapEntriesToGalaxy'
import { useWarpTransition } from '@/features/navigation/useWarpTransition'
import { GALAXY, STARFIELD } from '@/lib/constants'
import { env } from '@/lib/env'
import { useFilesystemStore } from '@/store/filesystemStore'
import { useSearchStore } from '@/store/searchStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useUiStore } from '@/store/uiStore'
import type { CelestialBody } from '@/types'
import { basename } from '@/utils/path'

import { CameraRig } from './CameraRig'
import { MoonField } from './MoonField'
import type { InstancedBody } from './interactiveBody'
import { OrbitRings } from './OrbitRings'
import { ParticleField } from './ParticleField'
import { PerfProbe } from './PerfProbe'
import { Planet } from './Planet'
import { Stars } from './Stars'
import { Sun } from './Sun'

/**
 * Composes the current directory into a solar system.
 * All data flows in from the stores; the components below stay presentational.
 */
export function GalaxyScene() {
  const currentPath = useFilesystemStore((state) => state.currentPath)
  const entries = useFilesystemStore((state) => state.entries)

  const selected = useSelectionStore((state) => state.selected)
  const select = useSelectionStore((state) => state.select)
  const setHovered = useSelectionStore((state) => state.setHovered)
  const hoveredPath = useSelectionStore((state) => state.hovered)
  const openContextMenu = useUiStore((state) => state.openContextMenu)

  const query = useSearchStore((state) => state.query.trim().toLowerCase())
  const { enterSystem } = useWarpTransition()
  const { open: openEntry } = useEntryActions()
  const reducedMotion = useUiStore((state) => state.reducedMotion)

  const system = useMemo(
    () => mapEntriesToGalaxy(currentPath ?? '', basename(currentPath ?? ''), entries),
    [currentPath, entries],
  )

  const isDimmed = useCallback(
    (body: CelestialBody) => query.length > 0 && !body.label.toLowerCase().includes(query),
    [query],
  )

  // Split once: the two groups render through completely different paths.
  const { planets, instanced } = useMemo(() => {
    const planets = system.bodies.filter((body) => body.type === 'planet')

    // Loose files and every planet's satellites share one instanced mesh, so
    // neither adds a draw call or a per-frame callback.
    const instanced: InstancedBody[] = system.bodies
      .filter((body) => body.type !== 'planet')
      .map((body) => ({ body }))

    for (const planet of planets) {
      for (const satellite of planet.satellites ?? []) {
        instanced.push({ body: satellite, parent: planet.orbit })
      }
    }

    return { planets, instanced }
  }, [system.bodies])

  const handleSelect = (body: CelestialBody, additive: boolean) =>
    select(body.id, additive ? 'toggle' : 'replace')

  const handleHover = (body: CelestialBody | null) => setHovered(body?.id ?? null)

  const handleContextMenu = (body: CelestialBody, screen: { x: number; y: number }) => {
    // Right-clicking outside the selection targets just that body, matching
    // Explorer; right-clicking inside it keeps the multi-selection intact.
    if (!selected.has(body.id)) select(body.id)
    openContextMenu({ path: body.id, ...screen })
  }

  /** Double-click: folders are flown into, files are handed to Windows. */
  const handleOpen = (body: CelestialBody, worldPosition?: Vector3) => {
    if (body.type === 'planet' && worldPosition) {
      // Built explicitly rather than via toArray(): that resolves to a tuple
      // only through contextual overload selection, easy to break silently.
      void enterSystem(body.id, [worldPosition.x, worldPosition.y, worldPosition.z])
      return
    }

    const entry = entries.find((candidate) => candidate.path === body.id)
    if (entry) void openEntry(entry)
  }

  return (
    <>
      <CameraRig />

      <ambientLight intensity={0.35} />
      <directionalLight position={[40, 60, 30]} intensity={1.1} />
      <hemisphereLight args={['#7dd3fc', '#05070a', 0.25]} />

      {/* Two parallax layers make the sky feel deep. */}
      <Stars />
      <Stars count={1200} radius={STARFIELD.radius * 0.55} speed={-1.6} tint="#a5b4fc" />

      <Sun />
      <ParticleField />

      {/* Counts what is actually drawn: `system.bodies` excludes satellites,
          which are nested under each planet and can outnumber the rest. */}
      {env.enableDebug && <PerfProbe bodies={planets.length + instanced.length} />}

      {/* All orbit paths in one mesh. */}
      <OrbitRings planets={planets} selected={selected} />

      {/* Every file in one mesh — the count no longer scales with the folder. */}
      <MoonField
        bodies={instanced}
        selected={selected}
        hoveredPath={hoveredPath}
        isDimmed={isDimmed}
        frozen={reducedMotion}
        onSelect={handleSelect}
        onOpen={handleOpen}
        onHover={handleHover}
        onContextMenu={handleContextMenu}
      />

      {/* Planets stay individual: they carry labels, satellites and their own
          entrance animation, and are capped at a count that stays cheap. */}
      {planets.map((body, index) => (
        <Planet
          key={body.id}
          body={body}
          index={index}
          selected={selected.has(body.id)}
          hovered={hoveredPath === body.id}
          dimmed={isDimmed(body)}
          showLabel={planets.length <= GALAXY.labelLimit}
          onSelect={handleSelect}
          onOpen={handleOpen}
          onContextMenu={handleContextMenu}
          onHover={handleHover}
        />
      ))}
    </>
  )
}
