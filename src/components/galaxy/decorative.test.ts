import { describe, expect, it } from 'vitest'

import orbitRingsSource from './OrbitRings.tsx?raw'
import particleFieldSource from './ParticleField.tsx?raw'
import starsSource from './Stars.tsx?raw'
import sunSource from './Sun.tsx?raw'

/**
 * Scenery must never be a pointer target.
 *
 * The sun's corona is a plane nine times the star's width, billboarded at the
 * origin — precisely where the innermost files orbit. While it was raycastable
 * it swallowed every click on a body behind it, which read as "moons are
 * unclickable in some folders". Starfields and dust carry the same hazard.
 *
 * Asserted against the source: the alternative is a full WebGL context, and the
 * rule being protected is "this prop is present on every decorative mesh".
 */
const DECORATIVE = {
  'Sun.tsx': sunSource,
  'Stars.tsx': starsSource,
  'ParticleField.tsx': particleFieldSource,
  'OrbitRings.tsx': orbitRingsSource,
}

describe('decorative objects', () => {
  for (const [name, source] of Object.entries(DECORATIVE)) {
    it(`${name} opts out of raycasting`, () => {
      const meshes = source.match(/<(mesh|points|instancedMesh)\b/g) ?? []
      const optOuts = source.match(/raycast=\{\(\) => null\}/g) ?? []

      expect(meshes.length).toBeGreaterThan(0)
      expect(optOuts).toHaveLength(meshes.length)
    })
  }
})
