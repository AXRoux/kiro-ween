# Tasks: painted gate

- [x] 1. Painted scene and animation layers (Req 1)
  - [x] 1.1 `Scene.tsx`: replace `Castle.tsx`; export `SCENE`, `PHONE`, `SCREEN` constants; render `scene.webp`
        inside `scene__painting` with `aria-hidden="true"` on the container
  - [x] 1.2 `scene__moon` div: breathing halo over the moon circle, CSS `breathe` keyframe
  - [x] 1.3 `Bats` sub-component: five bat SVG paths in `scene__bats`, each with its own CSS loop and flap delay,
        inside the painting container
  - [x] 1.4 `scene__lights` layer: maps `LIGHTS` from `sceneLights.ts` (excluding signal positions) to `<span>`
        elements with staggered animation delays; `light--twinkle` variant for string lights
  - [x] 1.5 `scene__fog` layer: two drifting ellipses with `fog` / `fog2` CSS keyframes
  - [x] 1.6 `scene__violet` layer: violet edge wash CSS overlay
  - [x] 1.7 `scene.css`: `@media (prefers-reduced-motion: reduce)` stops all animations on `.scene__moon`,
        `.bat`, `.light`, `.signal`, `.scene__fog`, `.scene__violet`
  - [x] 1.8 `sceneLights.ts`: light-source array `[x, y, radius, twinkle]` auto-detected from the painting

- [x] 2. Signal lights (Req 2)
  - [x] 2.1 `SIGNALS` constant in `Scene.tsx`: `[[314, 484], [1054, 637]]`
  - [x] 2.2 `isSignal()` helper filters signals out of the per-light layer
  - [x] 2.3 `scene__signals` layer: two `<span class="signal">` elements at signal positions
  - [x] 2.4 `scene.css`: `.signal` colour transitions via `data-stage` on `.scene`; flicker on `sensing/still/reading`

- [x] 3. Phone frame (Req 3)
  - [x] 3.1 `.phone` div at `PHONE` position with `phone__key` spans (action, up, down, power), all `aria-hidden`
  - [x] 3.2 `.phone__screen` inner div holds the React app
  - [x] 3.3 `scene.css`: violet rim light on `.phone` using box-shadow or border

- [x] 4. Wrought-iron gate doors replacing the portcullis (Req 4)
  - [x] 4.1 `arch.css`: `.arch__doors` perspective container; `.arch__door--left` hinged at left edge, `--right`
        at right edge; CSS `rotateY` transition from 0 to +/-90 deg driven by `data-stage`
  - [x] 4.2 `Door` sub-component in `Arch.tsx`: SVG with bars, rails, C-scrolls, stile lines, dog bars, split
        medallion; left and right halves rendered separately for the hinge
  - [x] 4.3 Torchlight glow behind the closed doors via `.arch__torchlight`
  - [x] 4.4 Read button, candlelight paths, moonbeam, step chip: unchanged from previous design

- [x] 5. Open the gate button (Req 5)
  - [x] 5.1 `Gate.tsx`: `.cta` pill button with `.cta__chip` key icon; border-beam ring animation via `gate.css`
  - [x] 5.2 Focus placed on the button on mount via `useRef`

- [x] 6. Layout and desktop window (Req 6)
  - [x] 6.1 `useLayout()` in `App.tsx`: bare below 600 px or below 80% scale; always bare=false in Electron
  - [x] 6.2 `Scene.tsx` bare mode: `scene--bare` class, painting not rendered
  - [x] 6.3 `electron/main.ts`: one `BrowserWindow` 1120 x 920 at zoom; `applyZoom` resizes only this window;
        no `createGhosts`, no `setIgnoreMouseEvents`
  - [x] 6.4 `electron/preload.ts`: bridge exposes only `desktop`, `close`, `minimize`

- [x] 7. Ghosts inside the painting (Req 7)
  - [x] 7.1 `Ghosts.tsx`: `Ghosts` component with five `Ghost` instances inside `div.ghosts` absolutely
        positioned over the scene; `GhostsWindow` removed
  - [x] 7.2 `haunt.ts`: updated `SCENE` / `PHONE` constants to match the painted scene dimensions; `reach()`
        and placement algorithm ensure ghosts never cover the phone frame; pure, no DOM imports
  - [x] 7.3 `tests/haunt.test.ts`: five tests with seeded PRNG (8000+ appearances) verifying phone coverage,
        scene containment, facing direction, side balance and tilt direction; all pass

- [x] 8. Font system (Req 8)
  - [x] 8.1 `global.css`: `--font-ui: "Geist"`, `--font-body: "Inter"`; `.hyperlegible` overrides both to
        Atkinson Hyperlegible
  - [x] 8.2 All text that users need to read is 18px or larger; 7:1 contrast verified on every surface
  - [x] 8.3 `Settings.tsx`: "Easier-to-read letters" switch sets `prefs.hyperlegible`; `App.tsx` toggles
        `document.documentElement.classList` on change

- [x] 9. Island and dock visual update (Req 9)
  - [x] 9.1 `StatusBar.tsx`: island glow rises with iridescent animation while speaking; double-bezel token
        styling; behaviour (tabIndex, aria-disabled, aria-keyshortcuts) unchanged
  - [x] 9.2 `Dock.tsx`: tiles have glass icon chips; light beam on hover and focus; behaviour unchanged

- [x] 10. Remove obsolete desktop-click-guard hook and add scene-guard (no source change)
  - [x] 10.1 `.kiro/hooks/desktop-click-guard.json` deleted
  - [x] 10.2 `.kiro/hooks/scene-guard.json` created: PostFileSave on Scene.tsx, Ghosts.tsx, haunt.ts and
        electron/main.ts; checks ghost coverage (haunt tests pass), painting aria-hidden + reduced-motion,
        phone screen dimensions (392 x 752), and no setIgnoreMouseEvents in electron/main.ts

- [x] 11. Documentation and steering
  - [x] 11.1 `README.md`: gallery updated to scene-gate.jpg / scene-beware.jpg (stacked, 480px) and
        phone-safe.jpg / phone-haul.jpg (220px); costume table rewritten for the painted night; fonts section
        mentions Geist, Inter and the Atkinson switch; "About the art" note added; castle/turrets/portcullis
        references removed
  - [x] 11.2 `.kiro/steering/product.md`: description updated to painted night; signal lights in the signals list
  - [x] 11.3 `.kiro/steering/structure.md`: Castle reference replaced with Scene; ghost window removed
  - [x] 11.4 `.kiro/steering/tech.md`: desktop section updated to one window, no click-through, no ghost window
  - [x] 11.5 `.kiro/steering/accessibility.md`: font rule updated to Geist + Inter at 18px/7:1 with Atkinson
        switch; decorative layers list updated to painting layers
  - [x] 11.6 `.kiro/specs/castle-desktop/requirements.md`: superseded notice added at the top

- [x] 12. Ship
  - [ ] 12.1 Deploy the web build and put the URL in the README

## Fixes after 0.2.0

- [x] F1. Camera always refused in the desktop app: `URL.origin` returns the string `"null"` for non-special
      schemes (like `app:`), so the permission handlers' origin check never passed. Added
      `electron/origin.ts` with an exported `isAppUrl(url): boolean` that checks `protocol === "app:"` and
      `host === "trick-or-read"` directly. Used it in both `setPermissionRequestHandler` and
      `setPermissionCheckHandler` (the check handler also falls back to its `requestingOrigin` argument when
      `wc` is null). Added `tests/origin.test.ts`: 8 cases covering accepted URLs and all the rejection
      variants. All pass.

- [x] F2. Voice falls back to the robotic system voice on the second press: `unlock()` played its silent
      clip on the shared `audio` element and called `audio.pause()` in a `finally`. When a cached clip was
      already queued, `playServer` set `audio.src` and called `audio.play()` before `unlock`'s `finally`
      ran; the stray `pause()` aborted the real play with `AbortError`, which `playServer` treated as a
      failure and handed to `playBrowser`. Fixed by making `unlock()` use a throwaway `Audio` element (never
      the shared one) and skip subsequent calls with an `unlocked` flag. Also added a one-shot retry in
      `playServer`: if `play()` rejects with `AbortError` while the clip is still current (`done` is false),
      retry `play()` once before falling through to the browser voice. `tests/voice.test.ts` was deleted
      after review: it tested a copy of the logic written inside the test, not `src/lib/voice.ts`. The fix
      was verified end to end in the running app (ElevenLabs clips play, no system-voice fallback).
