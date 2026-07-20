# Galaxy File Explorer

A Windows desktop application that renders your local file system as a living 3D galaxy.

Folders become **planets**. Files become **moons, satellites and asteroids**. The directory you
are standing in is the **star** at the centre of the system. Navigating a folder is a flight, not
a scroll.

The experience should feel cinematic and premium while remaining a genuinely usable file
explorer.

> **Status: architecture preview (v0.1.0).**
> The shell, the render pipeline, the state layer and the filesystem seam are in place. Explorer
> features are deliberately not implemented yet — see the [roadmap](#roadmap).

---

## Stack

| Concern         | Choice                                   |
| --------------- | ---------------------------------------- |
| Desktop shell   | Tauri 2 (Rust)                           |
| UI              | React 19 + TypeScript 5.9                |
| Build           | Vite 8 (Rolldown)                        |
| 3D              | Three.js + React Three Fiber + Drei      |
| State           | Zustand 5                                |
| Routing         | React Router 7 (hash router)             |
| Animation       | Framer Motion (DOM) + `useFrame` (WebGL) |
| Styling         | Tailwind CSS 4 (CSS-first tokens)        |
| Quality         | ESLint 9 (flat config) + Prettier        |
| Package manager | pnpm                                     |

### Deliberate deviations from the brief

- **TypeScript is pinned to 5.9, not 7.x.** `typescript-eslint` declares a `typescript <6.1.0`
  peer range; adopting TS 7 today would silently break linting for the whole project. Revisit
  once the plugin ships TS 7 support.
- **Hash routing instead of browser routing.** A packaged Tauri app is served from a file-like
  origin where history routes 404 on reload.
- **The galaxy lives in the shell, not in a route.** Mounting it under a route would tear down
  and rebuild the WebGL context on every navigation. Secondary pages render as overlays above the
  persistent scene.
- **Panels float over a full-bleed stage** rather than sitting in grid columns. The regions from
  the brief (header, nav, stage, info, status) are all present in `WindowLayout`, but the galaxy
  runs edge to edge underneath them so it reads as one continuous space — matching the supplied
  design.
- **A `FileSystemService` interface sits between the UI and the OS.** The app ships a mock
  provider so the entire interface runs in a plain browser; the Tauri provider is swapped in via
  one environment variable. No component knows which is active.

---

## Getting started

### Prerequisites

- **Node 20+** and **pnpm**
- For the desktop shell: **Rust** ([rustup.rs](https://rustup.rs)) and the
  **Visual Studio Build Tools** with the _Desktop development with C++_ workload
- WebView2 (preinstalled on Windows 11)

Verify Rust with `rustc --version` in a **new** terminal after installing.

### Commands

```bash
pnpm install         # install dependencies
cp .env.example .env # create the local environment file

pnpm dev             # browser only, mock filesystem — no Rust required
pnpm tauri:dev       # full desktop app (requires Rust)

pnpm build           # typecheck + production bundle
pnpm tauri:build     # MSI / NSIS installers

pnpm typecheck       # tsc across both project references
pnpm lint            # ESLint
pnpm lint:fix
pnpm format          # Prettier
pnpm format:check
```

`pnpm dev` is the fast loop: the mock provider serves a fixture tree, so the galaxy, navigation,
search, selection and inspector all work without the Rust backend.

### Environment

Only `VITE_`-prefixed variables reach the renderer, and every one is read through the typed
accessor in [`src/lib/env.ts`](src/lib/env.ts) — never `import.meta.env` directly.

| Variable            | Default                | Purpose                                    |
| ------------------- | ---------------------- | ------------------------------------------ |
| `VITE_APP_NAME`     | `Galaxy File Explorer` | Display name                               |
| `VITE_FS_PROVIDER`  | `mock`                 | `mock` \| `tauri` — which provider is used |
| `VITE_STAR_COUNT`   | `6000`                 | Background starfield density               |
| `VITE_ENABLE_DEBUG` | `true`                 | Exposes the `/debug` route                 |

---

## Folder structure

```
src/
  app/             composition root: App, AppShell, router, routes, error boundary
  components/
    ui/            generic, reusable primitives (Button, Panel, SearchBar, ListItem, Toast)
    layout/        application chrome (WindowLayout, Header, Sidebar, Toolbar, StatusBar)
    galaxy/        the 3D scene, one component per celestial concept
    explorer/      reserved for the list/detail view (empty by design)
  features/
    filesystem/    directory lifecycle + the entries → celestial bodies mapper
    navigation/    breadcrumbs, sidebar model
    search/        query wiring and match resolution
    inspector/     detail panel for the targeted body
  hooks/           cross-cutting React hooks
  store/           Zustand stores: filesystem, selection, camera, search, ui
  services/        the outside world: filesystem providers, platform/window controls
  lib/             framework-agnostic config, constants, classification, Three.js helpers
  types/           domain models (FsEntry, CelestialBody, …)
  utils/           pure helpers (path, format, hash, random, cn)
  styles/          globals.css design tokens + their TypeScript mirror
  assets/

src-tauri/         Rust backend: filesystem commands, window config, capabilities, icons
```

### The rule that keeps this scalable

**UI is separate from business logic.**

- `components/` are presentational. They receive props and render.
- `features/` own behaviour: hooks, mappers, and the components that wire stores to UI.
- `store/` holds state and the actions that mutate it.
- `services/` is the only layer that talks to the OS.

A component should never call `invoke()`; it calls a store action, which calls a service.

### Data flow

```
Rust command  →  FileSystemService  →  filesystemStore  →  mapEntriesToGalaxy  →  <Planet/> <Moon/>
                  (mock | tauri)                            (pure, deterministic)
```

`mapEntriesToGalaxy` is a pure function seeded by path hashes, so a folder's colour, size and
orbit are stable across renders, navigation and sessions.

---

## Design tokens

Every colour, font and geometry constant is declared once in
[`src/styles/globals.css`](src/styles/globals.css) under `@theme`, which makes each token
available both as a CSS variable and as a Tailwind utility (`bg-surface`, `text-accent`,
`w-sidebar`).

Three.js cannot read CSS variables, so [`src/styles/theme.ts`](src/styles/theme.ts) mirrors the
palette for the scene. **These two files are the only place colours are defined** — no magic hex
values in components.

| Token        | Value     | Used for                      |
| ------------ | --------- | ----------------------------- |
| `background` | `#05070A` | Deep space                    |
| `surface`    | `#0D121C` | Glass panels                  |
| `primary`    | `#38BDF8` | Primary actions, orbit rings  |
| `secondary`  | `#A855F7` | Video bodies, nebula          |
| `accent`     | `#67E8F9` | Selection, focus, search hits |
| `success`    | `#34D399` | Positive state                |
| `warning`    | `#FBBF24` | Current location, favourites  |
| `danger`     | `#FB7185` | Destructive actions           |

---

## Keyboard shortcuts

| Shortcut          | Action                    |
| ----------------- | ------------------------- |
| `Esc`             | Clear selection + search  |
| `Alt` + `←` / `→` | Back / forward            |
| `Alt` + `↑`       | Go to parent folder       |
| `Ctrl` + `R`      | Refresh current directory |
| `Ctrl` + `0`      | Reset the camera          |

---

## Roadmap

**Shipped — the foundation**

- [x] Desktop shell with custom window chrome
- [x] Animated galaxy: starfield, sun, planets, moons, orbit rings, dust, nebula
- [x] Orbit controls, idle camera drift, cinematic focus transitions
- [x] Zustand state layer and provider-agnostic filesystem service
- [x] Routing, dark theme, reusable component kit
- [x] Rust commands for directory listing, drives, reveal-in-Explorer

**Next — making it a real explorer**

- [ ] Switch the default provider to `tauri` and harden permission handling
- [ ] Animated zoom into a folder (warp transition between systems)
- [ ] Recursive search with an index
- [ ] Multi-select, drag & drop, context menus
- [ ] File previews and thumbnails on moon surfaces

**Later — depth**

- [ ] Multiple drives as separate galaxies
- [ ] Disk usage visualised through planet mass
- [ ] Distinct planet types per folder category
- [ ] Recent files as comets; favourites as constellations
- [ ] GPU particle effects and post-processing bloom
- [ ] Virtualised rendering for directories with thousands of entries

---

## Conventions

- TypeScript everywhere; `strict` plus `noUnusedLocals` / `noUnusedParameters`
- Absolute imports only (`@/components/...`) — aliases are declared in `tsconfig.app.json` and
  mirrored in `vite.config.ts`
- Small files, composition over inheritance, one concept per component
- Comments explain _why_, never _what_
- Zustand selectors must return primitives; derive arrays with `useMemo` (a selector that
  allocates re-renders forever under `useSyncExternalStore`)
- The `useFrame` render loop is imperative by design and is exempt from the React Compiler purity
  rules via a scoped ESLint override
