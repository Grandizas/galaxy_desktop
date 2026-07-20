import * as THREE from 'three'

/** Textures are expensive to build — create each one once per session. */
const cache = new Map<string, THREE.Texture>()

function fromCanvas(key: string, size: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const cached = cache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  paint(canvas.getContext('2d')!)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  cache.set(key, texture)
  return texture
}

/** Soft round dot — used for stars and particles. */
export const createSpriteTexture = (size = 64) =>
  fromCanvas('sprite', size, (ctx) => {
    const half = size / 2
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  })

/** Wide falloff halo — used for the sun's corona. */
export const createGlowTexture = (size = 256) =>
  fromCanvas('glow', size, (ctx) => {
    const half = size / 2
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(0.2, 'rgba(255,238,194,0.45)')
    gradient.addColorStop(0.55, 'rgba(245,182,74,0.14)')
    gradient.addColorStop(1, 'rgba(245,182,74,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  })

export function disposeTextureCache(): void {
  cache.forEach((texture) => texture.dispose())
  cache.clear()
}
