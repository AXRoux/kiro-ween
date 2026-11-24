# Design: castle desktop

## Overview

The castle is a React component (`Castle.tsx`) that wraps the app screen. It is costume and status display in one:
everything visible inside it carries either information or decoration, and all decoration is `aria-hidden`. The
desktop app (`electron/main.ts`) opens the same build in a frameless transparent window shaped exactly to the case,
with a second permanent child window for the ghosts.

```
                        ┌──────────────── Castle (460×880) ──────────────────┐
                        │  Case (SVG)   ─ stone, turrets, battlements         │
 Ghost window           │               ─ portcullis, beacon, arrow slits     │
 (680×920, mouse-       │  screen                                              │
  through)              │  ├─ StatusBar  ─ island (wave/Stop), dots            │
  └─ Ghosts             │  ├─ Arch       ─ video, portcullis, candlelight,     │
      (4 × Ghost)       │  │             ─ Read button, step chip              │
                        │  ├─ Verdict    ─ verdict card / Gate                 │
                        │  └─ Dock       ─ 4 tiles (Repeat, More, Haul, Sett.) │
                        └────────────────────────────────────────────────────┘
```

---

## Component responsibilities

### Castle (`src/components/Castle.tsx`)

Wraps the screen in the stone case. Exports three layout constants used by other components and by the Electron main
process:

| Constant | Value | Used by |
|---|---|---|
| `CASE` | `{ w: 460, h: 880 }` | `electron/main.ts` for the window size |
| `SCREEN` | `{ x: 34, y: 62, w: 392, h: 752, r: 42 }` | `castle.css` for the screen slot |
| `HALO` | `{ x: 110, top: 32, bottom: 8 }` | ghost placement and ghost-window sizing |

The `stage` prop and `live` flag drive `data-stage` on the root element, which CSS uses to colour the beacon and
slits (Requirement 1). When `bare` is true the case SVG is not rendered and the screen fills the viewport.
When `desktop` is true the `Ghosts` component is not rendered here (the ghost window holds them); close and minimise
buttons are shown instead, sending `castle:close` and `castle:minimize` over the preload bridge.

The `Case` sub-component is a 460 × 880 SVG. It draws in this order:
1. The moon (circle with a radial gradient face).
2. Battlements, the wall body, the gatehouse, four turrets — all with the drop-shadow filter.
3. Masonry texture (ashlar pattern), damp stain and film grain clipped to the body.
4. The beacon (`.castle__beacon`): the gatehouse window with a halo ellipse and a pointed-arch inner pane
   (`.castle__lit`), which CSS transitions to the verdict colour. The beacon's CSS class and the turrets' slit
   elements all share `.castle__lit` for colour.
5. The screen recess: a black glass rectangle at SCREEN position.
6. The nameplate, ivy, cobweb and bats (all `aria-hidden` costume).

Colour classes on `.castle` via `data-stage`:
- `off` / `watching` / `speaking` → moonlight idle
- `sensing` / `still` / `reading` → flicker animation
- `safe` / `ask` / `beware` → verdict colour (applied in `App.tsx` via `data-verdict`)

### Arch (`src/components/Arch.tsx`)

The pointed stone arch around the camera. Its `<section>` is labelled "Camera".

- The portcullis is an iron-bar grid inside a `<g class="portcullis">` clipped to the arch shape. CSS translates it
  upward out of view when stage leaves `off`.
- Candlelight progress is two SVG paths (`SIDE_L`, `SIDE_R`) with `pathLength=1` and `strokeDashoffset` driven by
  the `progress` prop (0–1 while `stage === "still"`, 1 while reading or speaking).
- The moonbeam sweep is a CSS animation on `.arch__beam`, active while `data-stage="reading"`.
- The step chip (`.arch__cue`) is `aria-hidden`; the stage name is also spoken and announced via the live region.
- The Read button is a `<button class="arch__read">` that covers the full arch area, `aria-label="Read now"`,
  `aria-keyshortcuts="Space"`, disabled when `!live`.

### StatusBar (`src/components/StatusBar.tsx`)

Lays out the status bar across the top of the screen: app name on the left, island in the centre, indicator dots on
the right.

The island (`<button class="island">`) is a black pill. `data-speaking` toggles two CSS states:
- `false`: pill shape, `tabIndex=-1`, `aria-disabled`.
- `true`: widens into a wave (seven `<i>` bars animated with staggered delays), shows the "Stop" label, `tabIndex=0`.

The dots mirror a phone's camera/mic indicator: green when the camera is on, orange when the microphone is active
(voice commands listening). Both are `aria-hidden` — the same information is in Settings and the live region.

### Dock (`src/components/Dock.tsx`)

Four `<button class="tile">` elements in a 2 × 2 CSS grid. Each tile is at minimum 64 px tall and contains an SVG
icon and a text label. The key cap is `aria-hidden`; `aria-keyshortcuts` on the button names the key. The Haul tile
carries a numeric badge. Tiles are always present and in the same grid position regardless of stage.

### Ghosts (`src/components/Ghosts.tsx`)

Two exported components:

**`Ghosts`** — renders four `Ghost` instances inside a `div.ghosts`. Returns `null` when
`prefers-reduced-motion: reduce` matches, checked on mount and updated via a `matchMedia` listener.

**`GhostsWindow`** — the root for the ghost window's page. Sets `document.documentElement.classList.add("ghost-window")`,
calls `window.castle.onVerdict(setVerdict)` to receive verdict updates from the castle window over IPC, and renders a
positioning div offset by `HALO.x` / `HALO.top` so the ghost coordinate system aligns with the castle.

**`Ghost`** — one ghost. It calls `haunt()` after an initial delay, renders, calls `haunt()` again after a random
pause when the `haunt` CSS animation ends, and so on indefinitely.

**`haunt(n)`** — produces a `Haunt` object describing one appearance:
- 80% of the time: a side ghost. Left or right is chosen at random. `x` is in the side-air band between the halo
  edge and the turret (`-HALO.x + 2` to `-size * 0.58` for the left, `CASE.w - size * 0.42` to
  `CASE.w + HALO.x - size - 2` for the right). `dy` is a random signed vertical travel (50–120 px); `y` is chosen
  so the ghost stays within the case height. The ghost faces toward the castle and tilts toward its direction of travel.
- 20% of the time: a sky ghost. `y` is in `[-HALO.top - 6, -4]` (above the battlements). `dx` is a signed horizontal
  travel (50–110 px); the ghost starts on the half of the sky that lets it cross toward the gatehouse.

Each `Ghost` element is a three-layer div:
1. `div.ghost` — position and CSS animation variables (`--dx`, `--dy`, `--life`, `--alpha`).
2. `div.ghost__pose` — applies `scaleX(-1)` for left-facing ghosts and the tilt rotation.
3. `div.ghost__float` — a gentle random-period float animation, offset by a random phase.
4. `svg.ghost__body` — references the `#ghost` symbol (defined once in a zero-size SVG at the top of `Ghosts`).

The ghost body shape (`ghostShape.ts`) is the WWII 23rd HQ Special Troops ("Ghost Army") insignia figure, traced
from the public-domain US Army insignia with potrace, without the lightning bolts.

---

## Two-window desktop design and why

The obvious approach — one transparent window whose click-through is toggled on and off as the cursor enters and
leaves the castle silhouette — does not work on macOS. When `setIgnoreMouseEvents(true)` is called, macOS stops
delivering `mousemove` events to the window. The flag cannot be toggled fast enough to track the cursor reliably, so
clicks meant for the castle land on the desktop, and the app gets stuck in an ignored state.

The solution is two separate windows with fixed, permanent roles:

| Window | Size | Mouse | Purpose |
|---|---|---|---|
| Castle | 460 × 880 at zoom | always takes clicks | the app, fully interactive |
| Ghost | 680 × 920 at zoom | always ignores | the decorative ghosts only |

The ghost window is a child of the castle window (`parent: win`), so on macOS it moves, hides and shows with its
parent automatically. `setIgnoreMouseEvents(true)` is called once at creation and never changed. Because the castle
window sits entirely within the ghost window's bounds, every click either lands on the castle (the castle window
handles it) or in the halo air (the ghost window ignores it and the click passes to the desktop).

Verdict colours are propagated by IPC: `App.tsx` calls `window.castle.setVerdict(verdict)` → the preload bridges
it to `ipcRenderer.send("castle:verdict", verdict)` → the main process forwards it with
`ghosts.webContents.send("castle:verdict", verdict)` → `GhostsWindow` calls
`window.castle.onVerdict(setVerdict)` to receive it.

---

## Layout numbers

| Measurement | Value |
|---|---|
| Case | 460 × 880 px |
| Screen inside case | 392 × 752 at offset (34, 62), corner radius 42 |
| Halo sides | 110 px each |
| Halo sky | 32 px |
| Halo below | 8 px |
| Ghost window | 680 × 920 px (at 1×) |
| Ghost window offset from castle | (−110, −32) |
| Minimum browser scale | 80% |
| Bare-mode threshold | viewport < 560 px wide, or scale < 80% |
| Dock tile minimum height | 64 px |
| Sheet row minimum height | 56 px |

---

## Zoom on the desktop

Zoom levels are `[0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8, 2]`. Cmd+/Cmd− step through them.
`applyZoom` calls `win.webContents.setZoomFactor`, resizes the castle window with `setContentSize`, resizes and
repositions the ghost window, and writes the value to `zoom.json` in the user data folder. On load, the saved zoom
is clamped to `maxZoom()`, which computes the largest level whose window fits the display's work area.

---

## Voice architecture

`voice.ts` is a module-level singleton. `serverVoice` starts as `null` (unknown) until `/api/health` responds.
When `serverVoice !== false` and an `Audio` element is available, `voice.say()` calls `playServer()`, which fetches
`/api/speak` and plays the returned MP3 as an object URL. If the fetch fails (key missing, network error), it falls
through to `playBrowser()`. When a clip is fetched it is stored in `clips` (a `Map<text+voice → objectURL>`) for
the browser session. The server keeps its own LRU cache of `Uint8Array` audio (up to 300 entries).

`voice.onSpeaking(listener)` lets components observe whether the voice is currently speaking.
`StatusBar` uses it to open the island. `App.tsx` uses it to pause voice-command listening.

The `unlock()` method plays a zero-volume clip inside the user's first click so the browser's autoplay policy does
not block subsequent speech.

---

## How each requirement is met

| Requirement | How |
|---|---|
| 1 — castle signals | `data-stage` and `data-verdict` on `.castle`; CSS transitions `.castle__lit` and `.castle__halo` to the verdict colour; flicker keyframe on `reading`/`still` |
| 2 — Read button | `<button class="arch__read">` covers the full arch area; `pointer-events: none` on the SVG overlay |
| 3 — fixed dock | CSS grid on `.dock`; tiles always rendered, never conditionally removed |
| 4 — Stop island | `data-speaking` on `.island`; CSS expands it; `tabIndex` toggled; Escape key → `run("hush")` |
| 5 — layout | `useLayout()` in `App.tsx` measures `innerWidth` and computes scale; `bare` removes the `Castle` case |
| 6 — vibration | `haptics.ts`; `PATTERNS` object; called in `App.tsx` after every verdict and on gate open |
| 7 — wake lock | `wakelock.ts`; `keepAwake()` called in a `useEffect` when `entered` becomes true |
| 8 — voices | `voice.ts` (browser) + `server/speak.ts` (ElevenLabs); two voice keys `serena`/`ana`; LRU cache |
| 9 — ghosts | `Ghosts.tsx`; `haunt()` keeps ghosts in the halo bands; reduced-motion check returns `null` |
| 10 — ghost window | `electron/main.ts`; `createGhosts()`; `setIgnoreMouseEvents(true)` once; IPC verdict relay |
