import { useMemo } from 'react'
import type { Vector3 } from 'three'

import { mapEntriesToGalaxy } from '@/features/filesystem/mapEntriesToGalaxy'
import { useWarpTransition } from '@/features/navigation/useWarpTransition'
import { STARFIELD } from '@/lib/constants'
import { useFilesystemStore } from '@/store/filesystemStore'
import { useSearchStore } from '@/store/searchStore'
import { useSelectionStore } from '@/store/selectionStore'
import type { CelestialBody } from '@/types'
import { basename } from '@/utils/path'

import { CameraRig } from './CameraRig'
import { Moon } from './Moon'
import { ParticleField } from './ParticleField'
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

  const query = useSearchStore((state) => state.query.trim().toLowerCase())
  const { enterSystem } = useWarpTransition()

  const system = useMemo(
    () => mapEntriesToGalaxy(currentPath ?? '', basename(currentPath ?? ''), entries),
    [currentPath, entries],
  )

  const isDimmed = (body: CelestialBody) =>
    query.length > 0 && !body.label.toLowerCase().includes(query)

  const handleSelect = (body: CelestialBody) => select(body.id)
  const handleHover = (body: CelestialBody | null) => setHovered(body?.id ?? null)
  const handleOpen = (body: CelestialBody, worldPosition: Vector3) => {
    if (body.type !== 'planet') return
    void enterSystem(body.id, worldPosition.toArray())
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

      {system.bodies.map((body, index) => {
        const props = {
          body,
          index,
          selected: selected.has(body.id),
          hovered: hoveredPath === body.id,
          dimmed: isDimmed(body),
          onSelect: handleSelect,
          onOpen: handleOpen,
          onHover: handleHover,
        }
        return body.type === 'planet' ? (
          <Planet key={body.id} {...props} />
        ) : (
          <Moon key={body.id} {...props} />
        )
      })}
    </>
  )
}
