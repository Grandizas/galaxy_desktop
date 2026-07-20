import { env } from '@/lib/env'

import { RouteOverlay } from './RouteOverlay'

export function AboutPage() {
  return (
    <RouteOverlay title={env.appName} subtitle="Version 0.1.0 — architecture preview">
      <p className="leading-relaxed">
        Galaxy File Explorer turns the Windows file system into a navigable star system. Folders
        become planets, files become moons and satellites, and moving through directories is a
        cinematic flight rather than a list scroll.
      </p>
      <p className="mt-4 leading-relaxed text-content-muted">
        This build ships the foundation: the desktop shell, the rendering pipeline, the state layer,
        and a provider seam where the real Windows filesystem plugs in.
      </p>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-[11px]">
        <dt className="text-content-subtle">STACK</dt>
        <dd>Tauri · React · TypeScript · Three.js</dd>
        <dt className="text-content-subtle">PROVIDER</dt>
        <dd>{env.fsProvider}</dd>
      </dl>
    </RouteOverlay>
  )
}
