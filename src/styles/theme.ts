/**
 * TypeScript mirror of the design tokens declared in `globals.css`.
 *
 * Three.js cannot read CSS custom properties, so the palette is duplicated here
 * as literal hex values. Anything rendered in the DOM should use the Tailwind
 * utilities instead of importing from this file.
 */

export const palette = {
  background: '#05070A',
  surface: '#0D121C',
  surfaceRaised: '#141B28',

  primary: '#38BDF8',
  primarySoft: '#7DD3FC',
  secondary: '#A855F7',
  accent: '#67E8F9',

  success: '#34D399',
  warning: '#FBBF24',
  danger: '#FB7185',
  info: '#60A5FA',

  content: '#EAF0F8',
} as const

export const celestial = {
  starCore: '#FFEEC2',
  starCorona: '#F5B64A',
  starfield: '#DBEAFE',
  nebulaViolet: '#9333EA',
  nebulaBlue: '#2563EB',
  nebulaCyan: '#22D3EE',
} as const

/** Hue wheel used to colour folder-planets deterministically. */
export const planetPalette = [
  '#7DD3FC',
  '#A855F7',
  '#34D399',
  '#FBBF24',
  '#FB7185',
  '#60A5FA',
  '#F472B6',
  '#2DD4BF',
] as const

export type PaletteColor = keyof typeof palette
export type CelestialColor = keyof typeof celestial
