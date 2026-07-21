import { describe, expect, it } from 'vitest'
import {
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Raycaster,
  SphereGeometry,
  Vector3,
} from 'three'

/**
 * `InstancedMesh.raycast()` broad-phases against a cached bounding sphere and
 * only computes it when it is null. Our instances orbit every frame, so a
 * sphere computed from one frame's positions can reject clicks in every later
 * frame — the mesh renders correctly but stops responding to the pointer.
 */
function buildField(positions: Vector3[], boundingRadius?: number) {
  const mesh = new InstancedMesh(
    new SphereGeometry(1, 8, 8),
    new MeshBasicMaterial(),
    positions.length,
  )
  const matrix = new Matrix4()
  const rotation = new Quaternion()
  const scale = new Vector3(1, 1, 1)

  positions.forEach((position, index) => {
    mesh.setMatrixAt(index, matrix.compose(position, rotation, scale))
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.updateMatrixWorld(true)

  if (boundingRadius !== undefined) {
    mesh.computeBoundingSphere()
    mesh.boundingSphere!.center.set(0, 0, 0)
    mesh.boundingSphere!.radius = boundingRadius
  }
  return mesh
}

/** Fires a ray straight down the -Z axis at the given x/y. */
function hit(mesh: InstancedMesh, x: number, y: number) {
  const raycaster = new Raycaster(new Vector3(x, y, 100), new Vector3(0, 0, -1))
  const intersects: ReturnType<Raycaster['intersectObject']> = []
  mesh.raycast(raycaster, intersects)
  return intersects
}

describe('instanced raycasting', () => {
  it('hits an instance at its current position', () => {
    const mesh = buildField([new Vector3(0, 0, 0), new Vector3(20, 0, 0)])

    expect(hit(mesh, 0, 0)).not.toHaveLength(0)
    expect(hit(mesh, 20, 0)[0]?.instanceId).toBe(1)
  })

  it('goes blind once instances move outside the cached bounding sphere', () => {
    const mesh = buildField([new Vector3(0, 0, 0)])

    // Force the cache, as the first click of a session would.
    hit(mesh, 0, 0)

    // The body orbits away — exactly what happens every frame in the scene.
    const matrix = new Matrix4()
    matrix.compose(new Vector3(60, 0, 0), new Quaternion(), new Vector3(1, 1, 1))
    mesh.setMatrixAt(0, matrix)
    mesh.instanceMatrix.needsUpdate = true

    expect(hit(mesh, 60, 0)).toHaveLength(0) // <- the bug
  })

  it('goes blind again if a remount drops the assigned sphere', () => {
    // A fresh mesh starts with boundingSphere === null. If the envelope is only
    // assigned in an effect keyed on the body list, a remount that does not
    // change that list — a hot reload, say — silently restores the bug. This is
    // why the assignment is re-asserted inside the frame loop.
    const mesh = buildField([new Vector3(0, 0, 0)], 100)
    mesh.boundingSphere = null // what a remount produces

    hit(mesh, 0, 0) // three lazily caches a one-frame snapshot

    const matrix = new Matrix4()
    matrix.compose(new Vector3(60, 0, 0), new Quaternion(), new Vector3(1, 1, 1))
    mesh.setMatrixAt(0, matrix)
    mesh.instanceMatrix.needsUpdate = true

    expect(hit(mesh, 60, 0)).toHaveLength(0)
  })

  it('keeps hitting when the sphere covers the whole orbital envelope', () => {
    // Orbits are bounded, so the envelope can be derived once and stays valid.
    const mesh = buildField([new Vector3(0, 0, 0)], 100)

    const matrix = new Matrix4()
    matrix.compose(new Vector3(60, 0, 0), new Quaternion(), new Vector3(1, 1, 1))
    mesh.setMatrixAt(0, matrix)
    mesh.instanceMatrix.needsUpdate = true

    expect(hit(mesh, 60, 0)).not.toHaveLength(0)
  })
})
