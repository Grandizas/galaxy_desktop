/**
 * Typed, validated access to build-time environment variables.
 * Import `env` — never `import.meta.env` — from feature code.
 */

const bool = (value: string | undefined, fallback: boolean) =>
  value === undefined ? fallback : value === 'true' || value === '1'

const int = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const fsProvider = (value: string | undefined): 'mock' | 'tauri' =>
  value === 'tauri' ? 'tauri' : 'mock'

export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? 'Galaxy File Explorer',
  fsProvider: fsProvider(import.meta.env.VITE_FS_PROVIDER),
  starCount: int(import.meta.env.VITE_STAR_COUNT, 6000),
  enableDebug: bool(import.meta.env.VITE_ENABLE_DEBUG, import.meta.env.DEV),
  isDev: import.meta.env.DEV,
} as const

export type Env = typeof env
