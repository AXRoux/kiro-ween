# Tasks: castle desktop

- [x] 1. The castle case (Req 1)
  - [x] 1.1 `Castle.tsx`: stone SVG with turrets, battlements, gatehouse, moon, ivy, cobweb, bats; `CASE`, `SCREEN`,
        `HALO` constants exported
  - [x] 1.2 Beacon and arrow slits (`.castle__lit`, `.castle__halo`) transition to the verdict colour via
        `data-stage` / `data-verdict` on `.castle`
  - [x] 1.3 Portcullis in `Arch.tsx`: iron-bar grid clipped to the arch shape; CSS animates it up when the camera opens
  - [x] 1.4 All case elements are `aria-hidden`; bats stop under `prefers-reduced-motion`

- [x] 2. Camera window and candlelight (Req 2)
  - [x] 2.1 `<button class="arch__read">` covers the full arch area; `aria-label="Read now"`,
        `aria-keyshortcuts="Space"`, disabled when camera is off
  - [x] 2.2 Candlelight: `SIDE_L` / `SIDE_R` paths with `strokeDashoffset` driven by `progress` prop
  - [x] 2.3 Moonbeam CSS animation active during `data-stage="reading"`
  - [x] 2.4 Step chip (`.arch__cue`) showing the current stage in plain language; `aria-hidden`
  - [x] 2.5 HoldGuide corner brackets shown while `stage === "watching"` and camera is on

- [x] 3. Fixed dock tiles (Req 3)
  - [x] 3.1 `Dock.tsx`: four tiles in a 2 × 2 CSS grid, minimum 64 px tall, always rendered
  - [x] 3.2 Labels, icons, `aria-keyshortcuts` and `aria-hidden` key caps on each tile
  - [x] 3.3 Numeric badge on the Haul tile

- [x] 4. Stop island (Req 4)
  - [x] 4.1 `StatusBar.tsx`: island expands to waveform with seven animated bars while speaking
  - [x] 4.2 `tabIndex` toggled; `aria-disabled` when not speaking; `aria-keyshortcuts="Escape"`
  - [x] 4.3 Clicking the island while speaking calls `onHush()`; Escape in `App.tsx` calls `run("hush")`

- [x] 5. Layout — case, bare mode and desktop (Req 5)
  - [x] 5.1 `useLayout()` in `App.tsx`: bare below 560 px or below 80% scale; always bare=false in Electron
  - [x] 5.2 `Castle` renders bare mode: `castle--bare` class, no case SVG
  - [x] 5.3 Electron: `applyZoom()` resizes castle window and ghost window together; zoom saved to `zoom.json`;
        clamped to `maxZoom()` on load; Cmd+/Cmd− step through zoom levels

- [x] 6. Vibration patterns (Req 6)
  - [x] 6.1 `haptics.ts`: `PATTERNS` with safe/ask/beware/steady/open; called after every verdict in `App.tsx`
  - [x] 6.2 Steady buzz on stillness detector firing; open buzz when the gate opens
  - [x] 6.3 `hapticsSupported()` guard; `setEnabled()` with localStorage persistence; shown in Settings only when
        supported

- [x] 7. Screen wake lock (Req 7)
  - [x] 7.1 `wakelock.ts`: `keepAwake()` requests `"screen"` lock; re-takes it on `visibilitychange`; releases on
        cleanup
  - [x] 7.2 `useEffect(() => entered ? keepAwake() : undefined, [entered])` in `App.tsx`
  - [x] 7.3 Absent `wakeLock` on `navigator` returns a no-op cleanup without throwing

- [x] 8. Voices — Serena and Ana (Req 8)
  - [x] 8.1 `server/speak.ts`: `VOICES` object with ElevenLabs IDs, stability and style settings for Serena and Ana;
        LRU cache up to 300 entries
  - [x] 8.2 `voice.ts`: session cache (text+voice → object URL); `playServer()` with `playBrowser()` fallback;
        `unlock()` for autoplay policy
  - [x] 8.3 Voice greeting spoken when the user switches voices in Settings
  - [x] 8.4 Rate slider 0.6–1.6× in Settings; `voice.setRate()` applied immediately
  - [x] 8.5 "Use my screen reader instead" switch in Settings; output goes to live region only
  - [x] 8.6 `voice.prefetch()` called after gate opens for greeting and help text

- [x] 9. Ghosts — appearance and animation (Req 9)
  - [x] 9.1 `Ghosts.tsx`: `Ghosts` component with four `Ghost` instances; returns `null` under reduced motion
  - [x] 9.2 `haunt()`: side ghosts in `[-HALO.x + 2, -size * 0.58]` / `[CASE.w - size * 0.42, CASE.w + HALO.x - size - 2]`;
        sky ghosts in `y ∈ [-HALO.top - 6, -4]`
  - [x] 9.3 Three-layer div (position → pose+tilt → float) + `svg.ghost__body` using `#ghost` symbol
  - [x] 9.4 Ghost shape from `ghostShape.ts` (traced Ghost Army insignia, public domain)
  - [x] 9.5 Ghosts `aria-hidden`; `pointer-events: none` in CSS

- [x] 10. Desktop ghost window (Req 10)
  - [x] 10.1 `electron/main.ts`: `createGhosts()` creates a child `BrowserWindow` sized `GHOST_W × GHOST_H`
        (680 × 920 at 1×), transparent, frameless, no shadow, not focusable
  - [x] 10.2 `setIgnoreMouseEvents(true)` called once at creation; never toggled
  - [x] 10.3 `placeGhosts()` called on castle `move`, `moved`, `resize` events; ghost window zoom matches castle zoom
  - [x] 10.4 Ghost window hidden on `minimize`, shown (inactive) on `restore`; destroyed when castle closes
  - [x] 10.5 IPC verdict relay: `App.tsx` → preload → `ipcMain` → `ghosts.webContents.send` → `GhostsWindow`
  - [x] 10.6 `GhostsWindow` exported from `Ghosts.tsx`; loaded from `app://trick-or-read/?ghosts`
  - [x] 10.7 `.kiro/hooks/desktop-click-guard.json` guards this fix: PostFileSave on `electron/main.ts`,
        `electron/preload.ts` and `src/components/Ghosts.tsx` runs an agent that checks the castle window never
        calls `setIgnoreMouseEvents`, the ghost window is a non-focusable child with `setIgnoreMouseEvents(true)`
        called once and never toggled, `placeGhosts` uses HALO (110, 32, 8) and the zoom factor, and
        `GhostsWindow` renders nothing interactive

- [x] 11. Tests and checks
  - [x] 11.1 `src/lib/haunt.ts`: pure `haunt(n, rng?)` generator extracted from `Ghosts.tsx`; geometry constants
        `CASE`, `SCREEN`, `HALO`, `ASPECT` defined here (no CSS imports). Position rule: a ghost may overlap the
        stone of the case (turrets) but must never cover the `SCREEN` rectangle, checked at both the start position
        and the end position (start + dx, start + dy). Side ghost x is clamped after computing dx so the drift
        cannot cause a late overlap: left ghost `x ≤ SCREEN.x − dx − size`; right ghost `x ≥ SCREEN.x + SCREEN.w − dx`.
        `Ghosts.tsx` imports from the new module and behaves identically. `tests/haunt.test.ts` generates 2 000
        haunts with a seeded PRNG and asserts the screen-clear rule at start and end, side ghosts face the castle,
        and sky ghosts are smaller than side ghosts. `bun test` and `bun run typecheck` pass.
  - [x] 11.1a Sky ghost clipping fix: `haunt()` sky ghost y changed to `rand(-10, -4)`. The binding
        constraint is the end keyframe (100%): `scale(1.06, 1.25)` raises the ghost's top by
        `0.125 * size * ASPECT`, and the drift adds `dy` (worst case −8), giving
        `y ≥ −32 + 8 + 6 + 0.125 × 54 × ASPECT ≈ −10.5`, ceiled to −10. The start keyframe's
        `translate(−0.1dx, −0.1dy)` offset is weaker (worst-case top `y − 26.8`).
        `tests/haunt.test.ts` replaces `skyWithinHaloVertical` with two helpers — `skyTopOkAtStart`
        (checks `y − 0.1·dy − 6 ≥ −HALO.top`) and `skyTopOkAtEnd` (checks
        `y + dy − 6 − 0.125·size·ASPECT ≥ −HALO.top`) — and the two sky-ghost test cases call
        them separately.
  - [ ] 11.2 End-to-end check of the desktop click path: open the app in Electron, move the mouse over the ghost-
        window area beside the castle, click, and assert that the click is received by whatever is under the ghost
        window (not consumed by the app). Currently not tested.

- [ ] 12. Ship
  - [ ] 12.1 Deploy the web build and put the URL in the README
