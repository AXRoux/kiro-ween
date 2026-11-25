# Design: painted gate

## Overview

The costume is a 1120 x 920 painting (`src/assets/scene.webp`) with the phone frame and all animated elements laid
over it in code. The root component is `Scene.tsx`, which replaces the old `Castle.tsx`. Everything that moves is
CSS animation over the static image: flickering flames, twinkling fairy lights, the moon's halo, bats, fog, violet
edge light, ghosts and the two signal lights. The phone (412 x 776 at scene position (354, 72)) stands in the gate
between stone pillars, with a violet rim light. The wrought-iron arch (Arch.tsx) now has two ornate doors that swing
open in 3D when the camera starts, replacing the portcullis.

```
Scene (1120 x 920)
  scene__painting (aria-hidden)
    img.scene__art          the painting
    .scene__moon            breathing halo over the moon
    svg.scene__bats         bats crossing the moon
    .scene__lights          per-light glows from sceneLights.ts (excluding signal positions)
    .scene__signals         two verdict-colour signal lights
    .scene__fog             two drifting fog ellipses
    .scene__violet          violet edge wash
  Ghosts                    ghosts in the air (aria-hidden, reduced-motion aware)
  .phone (at PHONE position)
    .phone__screen          the React app: StatusBar, Arch, Verdict/Gate, Dock
  .scene__controls          close and minimise orbs (desktop only)
```

---

## Component responsibilities

### Scene (`src/components/Scene.tsx`)

The costume root. Exports `SCENE`, `PHONE`, and `SCREEN` constants used by `haunt.ts` and by `App.tsx`.

```
SCENE  = { w: 1120, h: 920 }
PHONE  = { x: 354, y: 72, w: 412, h: 776 }
SCREEN = { x: 364, y: 84, w: 392, h: 752 }
```

The `stage` and `live` props drive `data-stage` on the scene root; CSS uses this to transition the signal lights
to the verdict colour and to flicker them while reading.

When `bare` is true the painting is not rendered and the screen fills the viewport. When `desktop` is true the
close and minimise orb buttons are shown in the top-right corner of the painting.

The `Bats` sub-component is a `<svg class="scene__bats">` with five bat paths, each on its own CSS animation loop
and flap cycle, all `aria-hidden`.

The `scene__lights` layer maps the `LIGHTS` array from `sceneLights.ts` (filtered to exclude the two signal
positions) to `<span class="light">` or `<span class="light light--twinkle">` elements, each positioned and
given a staggered animation delay derived from its index.

The `scene__signals` layer renders two `<span class="signal">` elements at the SIGNALS positions. CSS transitions
their colour based on `data-stage`.

### sceneLights.ts (`src/components/sceneLights.ts`)

An array of `[x, y, radius, twinkle]` tuples found automatically in the painting. The `twinkle` flag distinguishes
string lights (1) from flames (0); the Scene component applies different animation durations to each.

### Arch (`src/components/Arch.tsx`)

The camera view, unchanged in behaviour, with the portcullis replaced by two ornate iron doors that swing open in 3D.

**Gate doors:** Each door is an SVG rendered in its own `<div class="arch__door arch__door--left/right">` element.
CSS perspective and `rotateY` on `.arch__doors` and the individual door divs produce the 3D swing. The left door
is hinged at its left edge (transform-origin left) and swings to -90 deg; the right door is hinged at its right
edge and swings to +90 deg. The CSS transition fires when `data-stage` leaves `off`.

The door SVG draws in this order: a shade rect, vertical bars, two horizontal rails, C-scroll ornaments between
the rails, the stile lines, dog bars along the bottom, and the split medallion at the meeting point.

The `arch__read` button, candlelight progress paths, moonbeam, and step chip are all unchanged from the previous
design.

### StatusBar, Dock, Verdict, Gate, Settings, Haul

These components are unchanged in behaviour. Their visual style is updated to the double-bezel token system
(`global.css`) and use Geist/Inter. The Gate button is a liquid pumpkin pill with a border-beam animation.

### Ghosts (`src/components/Ghosts.tsx`)

Unchanged in behaviour from the castle-desktop design. The `Ghosts` component (not `GhostsWindow`, which is
removed) renders five `Ghost` instances inside `div.ghosts` positioned absolutely over the scene. Ghost positions
are computed by `haunt()` using `SCENE` and `PHONE` from `src/lib/haunt.ts`, which mirror `Scene.tsx`'s constants.

There is no `GhostsWindow` export; the ghost window architecture has been removed.

### electron/main.ts

One `BrowserWindow` sized `WIDTH x HEIGHT` (1120 x 920) at the current zoom. `transparent: true`,
`frame: false`, `hasShadow: false`. No `setIgnoreMouseEvents` call anywhere. No `createGhosts` function.
The preload bridge exposes only `close` and `minimize` via `castle:close` and `castle:minimize` IPC events.
Zoom levels, `applyZoom`, `stepZoom`, and `maxZoom` are unchanged.

### electron/preload.ts

```ts
contextBridge.exposeInMainWorld("castle", {
  desktop: true,
  close: () => ipcRenderer.send("castle:close"),
  minimize: () => ipcRenderer.send("castle:minimize"),
});
```

No `setVerdict` or `onVerdict` bridge; verdict colours are rendered by the same React tree that handles the app.

---

## The painting

`src/assets/scene.webp` was generated for this app with FLUX image models on fal.ai (Flux Kontext and FLUX dev
image-to-image) from a layout sketch. It was painted as three panels so the phone slot sits empty in the middle:
the left panel has the haunted mansion and lantern-lit stairs, the right panel has the giant lavender moon with bats,
and the middle gap is where the phone frame sits. Light sources were found automatically and are listed in
`sceneLights.ts`.

---

## Layout numbers

| Measurement | Value |
|---|---|
| Scene | 1120 x 920 px |
| Phone frame in scene | 412 x 776 at (354, 72) |
| Screen inside phone | 392 x 752 at (364, 84) |
| Bare-mode threshold | viewport narrower than 600 px, or scale below 80% |
| Minimum browser scale | 80% |
| Dock tile minimum height | 64 px |
| Sheet row minimum height | 56 px |
| Desktop window | 1120 x 920 at the current zoom, one window |

---

## Zoom on the desktop

Unchanged from the castle-desktop design. Zoom levels are `[0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8, 2]`.
`applyZoom` resizes only the one castle window (no ghost window to track). The zoom is saved in `zoom.json` in the
user data folder and clamped to `maxZoom()` on load.

---

## Font system

| Font | Use |
|---|---|
| Geist | Interface words: tile labels, sheet legends, status bar name, headings |
| Inter | Reading text: verdict card body, allergen chips, settings detail text, sheet rows |
| Atkinson Hyperlegible | Replaces both when "Easier-to-read letters" is on |

All three are loaded via `@fontsource` packages. The `hyperlegible` class on `<html>` overrides the font-family
custom property (`--font-body`, `--font-ui`) defined in `global.css`.

---

## Signal light colour transitions

CSS on `.scene` with `data-stage`:

| `data-stage` | Signal colour |
|---|---|
| `off` / `watching` / `speaking` | moonlight idle (`#e8dfff` glow) |
| `sensing` / `still` / `reading` | flicker animation |
| `safe` | green (`#4ade80`) |
| `ask` | amber (`#fb923c`) |
| `beware` | red (`#f87171`) |

`App.tsx` sets `data-stage` on the scene root via the `stage` and `live` props. When `live` is false, `data-stage`
is always `off` regardless of the actual stage.

---

## Ghost placement

`haunt()` in `src/lib/haunt.ts` uses the `SCENE` and `PHONE` constants from that file (which mirror `Scene.tsx`).
The function places ghosts in two bands:

- **Left band:** between the left scene edge and the left side of the phone frame.
- **Right band:** between the right side of the phone frame and the right scene edge.

For each band, `reach()` computes the full bounding box of the ghost across the entire animation (lead step back,
drift, bob, stretch) and the placement algorithm ensures `reach()` never overlaps the phone frame plus an 8px
margin, and never goes outside the scene.

`tests/haunt.test.ts` runs 8000+ appearances with a seeded PRNG plus four extreme RNG inputs to verify these rules.

---

## How each requirement is met

| Requirement | How |
|---|---|
| 1 -- painted scene | `scene__painting` container with `scene.webp` and animation layers |
| 2 -- signal lights | `scene__signals` layer; `data-stage` CSS transitions |
| 3 -- phone frame | `.phone` div at PHONE position; `phone__key` spans for physical detail |
| 4 -- iron gate | `.arch__door` SVGs with CSS `rotateY` perspective swing replacing the portcullis |
| 5 -- Open the gate button | `.cta` pill with `.cta__beam` border animation; `Gate.tsx` |
| 6 -- layout / desktop | `useLayout()` unchanged; one `BrowserWindow` in `electron/main.ts` |
| 7 -- ghosts | `Ghosts.tsx` with `haunt()` using SCENE/PHONE; five ghosts; tested |
| 8 -- fonts | Geist + Inter via `@fontsource`; `hyperlegible` class switches to Atkinson Hyperlegible |
| 9 -- island / dock | `StatusBar.tsx` and `Dock.tsx` visual update only; behaviour unchanged |
