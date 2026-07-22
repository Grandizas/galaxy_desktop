import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Matrix4, Quaternion, Sphere, Vector3, type Group, type InstancedMesh } from 'three'

import type { CelestialBody } from '@/types'

import { interactiveBodyAt, type InstancedBody } from './interactiveBody'

import { BodyLabel } from './BodyLabel'

interface MoonFieldProps {
  bodies: readonly InstancedBody[]
  selected: ReadonlySet<string>
  hoveredPath: string | null
  isDimmed: (body: CelestialBody) => boolean
  frozen?: boolean
  onSelect?: (body: CelestialBody, additive: boolean) => void
  onOpen?: (body: CelestialBody) => void
  onHover?: (body: CelestialBody | null) => void
  onContextMenu?: (body: CelestialBody, screen: { x: number; y: number }) => void
  onBodyPointerDown?: (body: CelestialBody, clientX: number, clientY: number) => void
}

/** How much a hovered or selected body grows. */
const HOVER_SCALE = 1.6

/* Scratch objects — reused every frame to keep the loop allocation-free. */
const matrix = new Matrix4()
const position = new Vector3()
const rotation = new Quaternion()
const scale = new Vector3()
const color = new Color()

/**
 * Every file in the system drawn as a single instanced mesh.
 *
 * One mesh per file meant hundreds of draw calls in a real directory. Instances
 * share one geometry and one material, so the count is constant no matter how
 * many files there are, and the per-frame orbit maths runs in one tight loop
 * rather than one `useFrame` callback per body.
 *
 * The trade: instancing carries a per-instance colour but not a per-instance
 * emissive, so these use an unlit material. Moons read as small bright dots
 * either way, and the sun's light never reached them meaningfully at this size.
 */
export function MoonField({
  bodies,
  selected,
  hoveredPath,
  isDimmed,
  frozen = false,
  onSelect,
  onOpen,
  onHover,
  onContextMenu,
  onBodyPointerDown,
}: MoonFieldProps) {
  const meshRef = useRef<InstancedMesh>(null)
  /** Follows the hovered instance so its label tracks the moving body. */
  const labelGroupRef = useRef<Group>(null)

  const hoveredIndex = useMemo(
    () => bodies.findIndex(({ body }) => body.id === hoveredPath),
    [bodies, hoveredPath],
  )
  const hoveredBody = hoveredIndex >= 0 ? bodies[hoveredIndex]?.body : undefined

  /*
   * `InstancedMesh.raycast()` broad-phases against a bounding sphere that it
   * computes once from the current instance matrices and then caches. Our
   * instances orbit every frame, so that snapshot silently stops matching them
   * and the field becomes unclickable while still rendering perfectly.
   *
   * Orbits are bounded, so the true envelope is derivable in closed form.
   */
  const envelope = useMemo(() => {
    let radius = 0
    for (const { body, parent } of bodies) {
      const reach = body.orbit.radius + (parent?.radius ?? 0) + body.radius * HOVER_SCALE
      radius = Math.max(radius, reach)
    }
    return radius * 1.1
  }, [bodies])

  // Colour changes are rare, so they are pushed on change rather than per frame.
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    bodies.forEach(({ body }, index) => {
      const emphasis = selected.has(body.id) || body.id === hoveredPath ? 1.5 : 1
      const dim = isDimmed(body) ? 0.18 : 1
      color.set(body.color).multiplyScalar(emphasis * dim)
      mesh.setColorAt(index, color)
    })

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [bodies, selected, hoveredPath, isDimmed])

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return

    /*
     * Re-asserted here rather than in an effect: any remount — a changed
     * instance count, a hot reload — produces a fresh mesh with a null sphere,
     * and three would then cache a single frame's snapshot. One null check per
     * frame is cheaper than the class of bug it prevents.
     */
    if (!mesh.boundingSphere) {
      mesh.boundingSphere = new Sphere(new Vector3(0, 0, 0), envelope)
    } else if (mesh.boundingSphere.radius !== envelope) {
      // A different directory with the same body count reuses the mesh, so the
      // envelope has to be refreshed even when nothing remounted.
      mesh.boundingSphere.center.set(0, 0, 0)
      mesh.boundingSphere.radius = envelope
    }

    const time = frozen ? 0 : clock.elapsedTime
    rotation.identity()

    for (let index = 0; index < bodies.length; index++) {
      const { body, parent } = bodies[index]!
      const { orbit } = body
      const angle = orbit.phase + time * orbit.speed

      position.set(
        Math.cos(angle) * orbit.radius,
        Math.sin(angle) * orbit.radius * Math.sin(orbit.inclination),
        Math.sin(angle) * orbit.radius,
      )

      // Satellites orbit a planet that is itself in motion — add the parent's
      // position rather than parenting the object, which would cost a node.
      if (parent) {
        const parentAngle = parent.phase + time * parent.speed
        position.x += Math.cos(parentAngle) * parent.radius
        position.y += Math.sin(parentAngle) * parent.radius * Math.sin(parent.inclination)
        position.z += Math.sin(parentAngle) * parent.radius
      }

      const emphasis = selected.has(body.id) || body.id === hoveredPath ? HOVER_SCALE : 1
      scale.setScalar(body.radius * emphasis)

      mesh.setMatrixAt(index, matrix.compose(position, rotation, scale))
      if (index === hoveredIndex) labelGroupRef.current?.position.copy(position)
    }

    mesh.instanceMatrix.needsUpdate = true
  })

  const bodyAt = (instanceId: number | undefined) => interactiveBodyAt(bodies, instanceId)

  if (bodies.length === 0) return null

  return (
    <>
      <instancedMesh
        ref={meshRef}
        // `key` forces a new mesh when the count changes — instance buffers are
        // fixed-size and cannot grow in place.
        key={bodies.length}
        args={[undefined, undefined, bodies.length]}
        frustumCulled={false}
        onPointerDown={(event) => {
          if (event.button !== 0) return // left button only; right = context menu
          const body = bodyAt(event.instanceId)
          if (!body) return
          event.stopPropagation()
          onBodyPointerDown?.(body, event.clientX, event.clientY)
        }}
        onClick={(event) => {
          const body = bodyAt(event.instanceId)
          if (!body) return
          event.stopPropagation()
          onSelect?.(body, event.ctrlKey || event.metaKey)
        }}
        onDoubleClick={(event) => {
          const body = bodyAt(event.instanceId)
          if (!body) return
          event.stopPropagation()
          onOpen?.(body)
        }}
        onContextMenu={(event) => {
          const body = bodyAt(event.instanceId)
          if (!body) return
          event.stopPropagation()
          onContextMenu?.(body, { x: event.clientX, y: event.clientY })
        }}
        onPointerMove={(event) => {
          const body = bodyAt(event.instanceId)
          if (!body || body.id === hoveredPath) return
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
          onHover?.(body)
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
          onHover?.(null)
        }}
      >
        {/* Low-poly on purpose: with thousands of instances a few pixels
            across, segment count is pure cost and no one can see it. */}
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* One label, moved to whichever instance is hovered. */}
      {hoveredBody && (
        <group ref={labelGroupRef}>
          <BodyLabel
            label={hoveredBody.label}
            meta={hoveredBody.meta}
            offset={hoveredBody.radius + 0.7}
            detailed
          />
        </group>
      )}
    </>
  )
}
