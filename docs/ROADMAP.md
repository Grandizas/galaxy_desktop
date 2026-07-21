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

### 2.2 Navigation invariants ✅ done

Writing tests for the review fix above exposed that **back and forward had never worked**.
`navigateTo` unconditionally set `historyIndex` to the end of the stack, so Back moved the folder
but snapped the pointer forward again; the second press went nowhere, and the forward stack was
truncated at the wrong position.

Two invariants now hold, each with tests:

1. **A failed navigation changes nothing.** Not the path, not the entries, not the history pointer.
   This includes undoing the optimistic jump into a cached listing whose revalidation fails — the
   case that started this thread.
2. **`replaceHistory` means the caller owns the pointer.** Back, forward and refresh move within
   the existing history; only genuinely new navigation extends it.

**Layered animation.** Orbital position, entrance scale and hover scale are driven by three separate
refs on nested groups. Sharing one object would make them fight for `scale` every frame.

---

## Phase 3 — Explorer essentials — mostly done

| Feature                                                   | State                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| ✅ Context menu (Open, Rename, Copy path, Reveal, Delete) | Right-click any body; closes on Escape, outside click or window blur            |
| ✅ `create_directory` / `rename_entry` / `delete_entries` | Rust commands, all async and off the main thread                                |
| ✅ Recycle Bin, never a hard delete                       | The `trash` crate hands the operation to the shell, so everything is restorable |
| ✅ Delete confirmation                                    | Modal focuses **Cancel**, so a stray Enter cannot delete                        |
| ✅ Ctrl-click multi-select                                | Right-clicking inside a selection keeps it; outside it targets one body         |
| ✅ New folder button → immediate inline rename            | Picks a free "New World N" name                                                 |
| ✅ `F2` rename, `Delete` key                              | Wired through the same actions as the menu                                      |
| ⬜ Shift-range select and marquee                         | `selectionStore` models the anchor; no UI yet                                   |
| ⬜ Drag & drop                                            | Deferred — see below                                                            |
| ⬜ "Form dust" birth animation                            | New folders currently just materialise with the rest                            |

### The safety layer

Deleting real files deserved more care than the rest of the app, so `src-tauri/src/safety.rs`
gates every mutation and has **7 tests of its own**:

- **Path traversal is impossible.** A rename to `..\..\Windows` is rejected — names must be plain
  file names, so an operation can never escape its directory.
- **Protected paths.** Drive roots, the user profile, well-known folders (Desktop, Documents…) and
  Windows system directories cannot be deleted.
- **Validate-all-then-act.** One protected path anywhere in a multi-select aborts the entire batch,
  so a delete can never be half-applied.
- **Names Windows would silently alter** (trailing dots/spaces, `CON`, `NUL`, `COM1`…) are refused
  rather than creating a file that can never be opened or deleted again.

A test caught a real hole here: `C:\` parses as `Prefix` + `RootDir`, so an obvious
"fewer than two components means it's a root" check let the drive root through.

### Deferred: drag & drop

Moving a body onto a planet needs a 3D drag with a valid-target hit test, plus a `move_entries`
command with its own guard rails (no moving a directory into itself). That is a phase-sized piece
of work, not a finishing touch, and the value is lower than Phase 4's rendering work — a folder
with 4,700 hidden entries is a bigger problem than the absence of drag-to-move.

---

## Phase 4 — Scale and performance ✅ done (two follow-ups open)

### Measured first

`PerfProbe` samples `gl.info` inside the Canvas and publishes to `perfStore`; `PerfHud` shows
fps, peak frame time, draw calls and triangle count in the corner, and `/debug` lists the full
sample. Peak frame time rather than mean — a 200 ms stall matters more than a good average.

`estimateDrawCalls()` counts the same cost analytically, so the effect of a change is visible in
a unit test rather than only in a frame counter.

### Instancing

For a System32-sized directory (5,000 entries, 300 rendered):

|                                | Before |   After |
| ------------------------------ | -----: | ------: |
| Draw calls                     |    785 | **127** |
| Scene objects                  |    780 | **122** |
| `useFrame` callbacks per frame |    660 | **120** |

- **`MoonField`** draws every file _and_ every planet's satellites as one `InstancedMesh`. Their
  orbits are evaluated in a single loop over a flat array instead of 540 separate `useFrame`
  callbacks. Satellites orbit a planet that is itself moving, so both orbits are composed in that
  same loop rather than by parenting objects.
- **`OrbitRings`** instances all 120 orbit paths into one mesh. They never move, so the matrices
  are written once per system rather than per frame.
- **Planets stay individual.** They carry labels, an entrance animation and a selection halo, and
  they are capped at 120 — a count that stays cheap.

**The trade:** an instance carries a per-instance colour but not a per-instance emissive, so moons
now use an unlit material. At their size they read as small bright dots either way, and the sun's
light never meaningfully reached them.

### Measured on the real machine

`C:\Windows\System32`, 5,010 entries: **141 fps, 12.1 ms peak, 128 draw calls, 857k triangles.**
The analytical estimate predicted 127 draw calls against 128 actual, so `estimateDrawCalls()` can
be trusted for future changes.

### Spending the headroom

With files nearly free, the budget that hid 4,710 entries was mostly obsolete:

|                    | Before |                After |
| ------------------ | -----: | -------------------: |
| Planet budget      |    120 |              **220** |
| File budget        |    180 |            **2,500** |
| Hidden in System32 |  4,710 |            **2,328** |
| Bodies rendered    |    300 |            **2,682** |
| Draw calls         |    128 |  **189** (predicted) |
| Triangles          |   857k | **767k** (predicted) |

Nine times the bodies for _fewer_ triangles, because the geometry was far denser than anything
visible at these sizes: planet spheres dropped 48×48 → 32×24, moon instances 16×16 → 10×8.

**Labels above 60 planets show on hover only.** Two hundred captions overlap into noise, so this
is a legibility fix as much as a performance one — `<Html>` recomputes a CSS transform per element
per frame, and it was the most likely remaining bottleneck.

**Orbit rings now fade as their count grows.** Additive blending means overlapping rings
accumulate; at 220 they would bury the bodies they describe.

### 4.1 What instancing broke

Sharing one mesh changed two things that per-object rendering had given for free.

**Interaction died in sparse folders.** Satellites are decorative placeholders for a folder's
unread contents — `label: ''` and a synthetic id (`…\Desktop#satellite-0`) matching no entry.
`Planet` had rendered them without handlers, so they were inert. One shared mesh made every
instance interactive, so hovering produced an empty card and clicking selected a path the
inspector could not resolve. In `C:\Users\Nova` **20 of 22** small bodies were affected; in
System32 only 18%, which is why it looked folder-specific. `interactiveBodyAt()` restores the
distinction, with tests that fail against the pre-fix behaviour.

**Raycasting went stale.** `InstancedMesh.raycast()` broad-phases against a bounding sphere it
computes once and caches, but our instances orbit every frame. Individual meshes never had this
problem because their world matrix moves with them. The envelope is now derived in closed form —
orbits are bounded — and re-asserted inside the frame loop, because assigning it in an effect
missed remounts that did not change the body list (every hot reload).

**A correction.** An earlier version of this document blamed the sun's corona for swallowing
clicks. That was wrong: R3F walks up from each hit looking for an ancestor with handlers, so
objects with none produce no intersection and cannot block anything. The `raycast={() => null}`
opt-outs on the sun, starfields and dust are worth keeping, but as **performance** — 7,200
starfield points were being raycast on every pointer move for nothing.

### 4.2 Telemetry correctness

The HUD's body count read `system.bodies.length`, which holds planets and loose files only —
satellites are nested under each planet and were never counted. System32 reported 2,682 against
3,228 actually drawn. Draw calls and triangles were always right (they come from `gl.info`), but a
telemetry field that quietly undercounts is worse than none, and those numbers had already been
quoted in this document.

Two budget tests were also weaker than they looked:

- The fixture used 200 folders against a 220-planet budget, so removing folder truncation entirely
  would still have passed. It is now derived from the constants and asserts the fixture exceeds
  both budgets before testing truncation.
- The "draw calls stay flat" test compared 40 folders with 220 folders plus files, so the planet
  allowance could absorb up to 60 stray per-file draw calls. The folder set is now identical on
  both sides and only the file count varies, asserting exact equality.

Both were confirmed by reverting the source: removing folder truncation fails two tests, and
making files cost a draw call each fails two.

### Still open

- **Re-measure after the budget raise.** 189 draw calls and 767k triangles remain predictions, and
  the corrected body count has not been read off the HUD yet
- **The 160 ms worst frame**, most likely the initial load or a warp transition — a single stall
  rather than a steady-state problem, but worth isolating
- **LOD on planets** and an **adaptive quality tier** — both on the original plan, both deliberately
  not built. At 141 fps with a 12 ms peak there is no measured problem to solve, and building them
  now would be optimising against a guess, which is what the HUD exists to prevent
- Raising the file budget beyond 2,500 is possible, but a directory that large wants search rather
  than more dots

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
