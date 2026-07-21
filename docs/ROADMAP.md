# Implementation plan

How the scaffold becomes a real file explorer. Each phase is independently
shippable and leaves the app in a working state.

Legend: **⛔ blocked** · **🔨 build** · **🧪 verify**

---

## Phase 0 — Unblock the backend ✅ complete

Verified on Rust 1.97.1 / cargo 1.97.1.

| Task                                            | Result                                           |
| ----------------------------------------------- | ------------------------------------------------ |
| ✅ Rust toolchain installed                     | `rustc 1.97.1`                                   |
| ✅ `cargo check` — first compile of the backend | Clean, no errors                                 |
| ✅ `cargo clippy --all-targets`                 | Clean, no warnings                               |
| ✅ `windows-sys` FFI for `GetDiskFreeSpaceExW`  | Verified against the real disk: `C:\` → 1,023 GB |
| ✅ `dirs` v5 home directory resolution          | Resolves to an existing directory                |
| ✅ `pnpm tauri:dev`                             | Window opens, galaxy renders, no runtime errors  |
| ✅ Backend test suite (4 tests)                 | `pnpm test:rust`                                 |

**Added along the way**

- Four Rust integration tests that exercise the real machine rather than mocks — they would have
  caught a silently-failing FFI call, which is the failure mode that worries me most in `unsafe`
  code.
- **Real volume labels** via `GetVolumeInformationW`, falling back to `Local Disk (C:)` when a
  volume is unnamed (which is the case on this machine).

---

## Phase 1 — Link the real filesystem

This is the "connect folders and files" phase. The seam already exists; this makes it load real
data instead of fixtures.

### 1.1 Flip the provider ✅ done

`VITE_FS_PROVIDER=tauri` is now the default. `getFileSystemService()` still falls back to the mock
when the Tauri bridge is absent, so `pnpm dev` in a browser keeps working unchanged.

### 1.2 Close the known wire-up gaps

| Gap                                                                                                 | Fix                                                                                                                |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| ~~`childCount` is never populated by the Tauri provider, so real folders render **no satellites**~~ | ✅ Done — new `count_children` command, called _after_ the listing renders so a slow count never delays the galaxy |
| ~~The sidebar derives the home path from `history[0]`~~                                             | ✅ Done — `homePath` is now explicit state, set during `initialize()`                                              |
| ~~Drive roots normalise to `C:` while every other path keeps a trailing separator~~                 | ✅ Done — `normalizePath` canonicalises drive roots; `dirname`/`join`/`basename` updated, 14 unit tests            |
| ~~System folders throw on read; the store shows a raw OS error~~                                    | ✅ Done — `toMessage()` maps each `FsErrorCode` to human copy ("Windows denied access to System32")                |
| ~~Nothing renders the hovered body~~                                                                | ✅ Done — `<BodyLabel>` renders the hover card; hover state now lives in the store, shared by both bodies          |
| ~~Files show no label in the scene~~                                                                | ✅ Done — moons label on hover or selection, planets always                                                        |
| Still open: an in-scene empty/denied state (the error currently only appears in the status bar)     | Render a "this region is sealed" message at the system centre                                                      |

### 1.3 Guard against real directories ✅ done

- Render budget of **120 planets / 180 moons** (`GALAXY.maxPlanets`, `GALAXY.maxMoons`)
- Overflow is surfaced in the status bar as "N not shown" in warning colour — never silent
- Kept entries are the **most recently modified**, so the interesting ones survive the cut
- The real fix (instanced rendering) still lands in Phase 4; raise the budget then

**Remaining before Phase 1 is closed:** confirm on a genuinely huge directory
(`C:\Windows\System32`) that the frame rate holds.

### 1.4 Fixes from the first review pass ✅ done

| Issue                                                                                                                 | Fix                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Disk I/O ran on the main thread.** Tauri executes sync commands there, so reading System32 froze the window         | Every disk-touching command is now `async` and delegates to `spawn_blocking` via `off_thread()`        |
| **Similar names collapsed onto one bearing.** A polynomial hash gave `ms-MY`/`ms-MT`/`nl-NL` the same angle           | murmur3 avalanche in `hashString`, plus golden-angle placement so alignment is structurally impossible |
| **Large systems stretched past the camera.** Linear orbit spacing put planet 120 at radius 663 with `maxDistance` 160 | √-based spacing keeps the outermost orbit under 110                                                    |
| **Satellites blinked on revisit.** A cached listing's `childCount` was overwritten by the fresh fetch                 | `mergeChildCounts()` carries known counts across                                                       |
| **Enriched folders ≠ rendered folders.** The store sliced alphabetically while the renderer picked by recency         | Both now share `byRecency()` from `utils/entries`                                                      |
| `lsof` failures silently swallowed in `kill-port`                                                                     | Distinguishes "no match" from a missing binary or real failure                                         |

---

## Phase 2 — Make navigation feel cinematic ✅ done

| Task                                                   | Result                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| ✅ Double-click a planet → fly into it                 | `Planet` reports its **live world position** (it is orbiting, so the stored orbit is already stale) |
| ✅ Warp transition                                     | `useWarpTransition`: dive → flash → emerge, in `features/navigation`                                |
| ✅ Staggered entrance on arrival                       | `useMaterialize`, ref-driven so 300 bodies do not re-render per frame                               |
| ✅ Back/forward/breadcrumb/sidebar fly rather than cut | A path-change effect triggers the arrival for any navigation that did not begin with a dive         |
| ✅ `reducedMotion` honoured                            | `CameraRig` snaps, orbits freeze at their starting angle, starfield stops, entrances are instant    |

**The load happens _during_ the dive**, not after it: `Promise.all([navigateTo, wait(diveMs)])`
means the flight hides the directory read instead of adding to it. A slow folder simply holds the
flash a little longer.

### 2.1 Review fixes ✅ done

| Issue                                                                                                                                                    | Fix                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **The failure branch was dead code.** `navigateTo` catches its own errors, so `allSettled` always reported _fulfilled_ — a denied folder still "arrived" | `navigateTo` now returns `Promise<boolean>`; the transition inspects the result                      |
| **`resetView` did not clear `warpPhase`**, so recovering from a failure left the white-out overlay on screen forever                                     | `resetView` returns the phase to `idle`; a `catch` guarantees recovery even from an unexpected throw |
| **Reduced motion was ignored on indirect navigation.** Back/forward/breadcrumb/sidebar still played the flash                                            | The path-change effect ends the warp immediately when reduced motion is on                           |

An earlier version of this document claimed a failed read "resets the view instead of stranding the
camera mid-warp". That was **not true when written** — the branch could never execute. It is true now,
and `filesystemStore.test.ts` covers it.

**Layered animation.** Orbital position, entrance scale and hover scale are driven by three separate
refs on nested groups. Sharing one object would make them fight for `scale` every frame.

---

## Phase 3 — Explorer essentials

The design file specifies all of these; none are implemented.

- **Context menu** (right-click a body): Open, Rename, Copy path, Reveal, Delete
- **File operations** in Rust: `create_directory`, `rename_entry`, `delete_entry` (to Recycle Bin,
  never a hard delete), each with a confirmation step
- **Multi-select**: Ctrl-click toggle, marquee select, Shift-range — `selectionStore` already
  models a set and a `lastSelected` anchor
- **Drag & drop**: body → planet to move; OS files → window to import (`dragDropEnabled` is
  already true in `tauri.conf.json`)
- **New folder** button with the design's "form dust" birth animation

**Done when:** you can create, rename and delete without leaving the galaxy.

---

## Phase 4 — Scale and performance

Directories with thousands of entries need a different rendering strategy.

| Technique                                      | Impact                                              |
| ---------------------------------------------- | --------------------------------------------------- |
| `<Instances>` / `InstancedMesh` for moons      | Thousands of files in one draw call                 |
| LOD on planets — drop to a billboard when far  | Geometry cost scales with what you can actually see |
| Move directory reads to a Rust background task | Listing a huge folder stops blocking the UI         |
| Cap DPR and add an adaptive quality tier       | Stable 60fps on integrated GPUs                     |
| Windowed loading for very large directories    | Render what is near the camera, stream the rest     |

Add a perf HUD to `/debug` (frame time, draw calls, body count) before optimising — measure first.

---

## Phase 5 — Search

Current search filters the open directory only.

1. Rust command that walks a subtree on a worker thread and streams results via events
2. In-memory index keyed by path, invalidated by a filesystem watcher (`notify` crate)
3. Results as a constellation overlay: matches glow, non-matches dim (the dimming already works)
4. `Enter` flies to the next match — `cycleMatch` exists, it just needs the camera call

---

## Phase 6 — Depth and polish

- **Planet types by folder character** — code repos, media libraries and system folders should
  look different at a glance
- **Disk usage as mass**: folder size drives planet radius; a recursive size calculation runs in
  the background
- **File previews**: image thumbnails mapped onto moon surfaces
- **Recent files as comets**, favourites as constellations
- **Multiple drives as separate galaxies** with a zoomed-out "system map"
- **Post-processing bloom** for the star and emissive bodies
- **GPU particle effects** — replace `ParticleField` with a shader-driven implementation behind
  the same props

---

## Cross-cutting, start now rather than later

| Concern           | Action                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Testing**       | No test runner yet. Add Vitest and cover `utils/path`, `mapEntriesToGalaxy`, and the store transitions — all pure and cheap to test |
| **Error UX**      | Every filesystem error currently lands as raw text in the status bar                                                                |
| **Accessibility** | The galaxy is mouse-only; add keyboard traversal between bodies                                                                     |
| **Persistence**   | Favourites, recent paths and settings should survive a restart (`tauri-plugin-store`)                                               |
| **CI**            | Run `typecheck`, `lint`, `format:check` and `cargo clippy` on every push                                                            |

---

## Suggested order

```
Phase 0  ──▶  Phase 1  ──▶  Phase 2  ──▶  Phase 3  ──▶  Phase 4 ──▶ 5 ──▶ 6
(unblock)     (real data)   (feel)       (usable)      (scale)
                   │
                   └── add Vitest here, while the pure functions are still small
```

Phases 0 and 1 are the only hard prerequisites. After that the order is a product decision:
Phase 2 makes demos impressive, Phase 3 makes the app genuinely usable.
