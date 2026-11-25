# Requirements: painted gate

## Introduction

This spec covers the redesign of Trick or Read's costume from a stone castle case to a painted Halloween night. The
app itself (scanning, allergens, verdicts, voice) is unchanged. What changed is everything around the phone: instead
of a stone castle silhouette rendered in SVG, the costume is a full-bleed painting (1120 x 920) with the phone
standing in the gate between stone pillars. The phone frame, every animated element, and the ghosts are code laid
over the painting.

The camera window is now an ornate wrought-iron gate in a pointed arch whose two doors swing open in 3D when the
camera starts. The desktop app is one window the size of the painting, transparent only outside its rounded corners,
with no separate ghost window and no click-through.

## Glossary

- **Scene:** the full 1120 x 920 painted area; the root component is `Scene.tsx`.
- **Phone slot:** the 412 x 776 frame at position (354, 72) in the scene where the app lives.
- **Screen:** the 392 x 752 inner area at (364, 84) where the React app renders.
- **Signal lights:** the pillar lantern (314, 484) and the lamp post (1054, 637) that carry the verdict colour.
- **Bare mode:** painting hidden; the screen fills the page. Used on phones and narrow or zoomed-in browsers.
- **Island:** the Dynamic-Island-style pill in the status bar that becomes the Stop control while the voice speaks.
- **Verdict:** one of Safe, Ask someone, Beware (see `product.md`).

---

## Requirement 1: the painted scene and its animated layers

**User story:** As a sighted companion, I want the costume to be a vivid Halloween scene so the app feels festive and
the verdict colours stand out against the painting.

1. WHEN the app loads in a wide enough viewport THE SYSTEM SHALL display the painting (`src/assets/scene.webp`,
   1120 x 920) as the background of the scene.
2. THE SYSTEM SHALL lay animated code layers over the painting: a breathing moon halo, bats crossing the moon on
   staggered loops, per-light animated glows for every window/lantern/pumpkin/fairy-light found in the painting
   (listed in `sceneLights.ts`), two fog layers drifting in opposite directions, and a violet edge wash.
3. THE SYSTEM SHALL mark all painting and animation layers `aria-hidden="true"`; all accessible information is
   inside the phone screen.
4. WHEN `prefers-reduced-motion` is set THE SYSTEM SHALL stop all CSS animations and transitions on the painting
   layers (moon, bats, lights, fog, violet wash); `Scene.tsx` returns `null` for the `Ghosts` component (handled
   by Ghosts itself).
5. THE SYSTEM SHALL keep the painting layers inside a container classed `scene__painting` so they can be targeted
   uniformly by the reduced-motion rule.

---

## Requirement 2: signal lights carrying the verdict

**User story:** As a sighted companion, I want specific lights in the painting to change colour with the verdict, so
I can see the result at a glance without looking at the verdict card.

1. THE SYSTEM SHALL identify the two signal positions in `Scene.tsx`: the pillar lantern at approximately (314, 484)
   and the lamp post at approximately (1054, 637).
2. WHEN no verdict is set THE SYSTEM SHALL colour the signal lights in a moonlight idle colour.
3. WHEN the verdict is Safe THE SYSTEM SHALL colour the signal lights green.
4. WHEN the verdict is Ask someone THE SYSTEM SHALL colour the signal lights amber.
5. WHEN the verdict is Beware THE SYSTEM SHALL colour the signal lights red.
6. WHILE the app is reading THE SYSTEM SHALL animate the signal lights with a flicker.
7. THE SYSTEM SHALL drive the signal colour through a `data-stage` attribute on the scene root, using CSS custom
   properties or classes, so no JavaScript runs on every frame.
8. THE SYSTEM SHALL render the signal lights in a separate `scene__signals` layer above the other lights so their
   colour is not washed out by the ambient glow layer.

---

## Requirement 3: the phone frame in the scene

**User story:** As a user, I want the phone to look like a real device standing in the gate, with a violet rim light
that ties it to the scene.

1. THE SYSTEM SHALL render a phone frame at position (354, 72), 412 wide and 776 tall, inside the scene.
2. THE SYSTEM SHALL show physical detail elements on the frame: a home-button key, a volume-up key, a volume-down
   key, and a power key, all `aria-hidden`.
3. THE SYSTEM SHALL apply a violet rim light effect to the phone frame that is consistent with the painting's
   lighting.
4. THE SYSTEM SHALL render the app screen (392 x 752) inside the phone frame; all interactive content lives here.
5. THE SYSTEM SHALL keep the phone frame outside the `scene__painting` container so it is not hidden by the
   reduced-motion or `aria-hidden` rules applied to the painting.

---

## Requirement 4: the wrought-iron gate window

**User story:** As a blind user, I want the camera window to behave identically to before: the whole window is the
Read button, candlelight fills while I hold still, and the arch glows in the verdict colour.

1. WHEN the camera is off THE SYSTEM SHALL show two wrought-iron gate doors closed across the camera window, with
   torchlight glowing behind them.
2. WHEN the camera starts THE SYSTEM SHALL animate the two gate doors swinging open in 3D, each hinged at its
   outer edge.
3. THE SYSTEM SHALL keep the Read button behaviour unchanged: `<button class="arch__read">` covers the full arch
   area, `aria-label="Read now"`, `aria-keyshortcuts="Space"`, disabled when the camera is off.
4. WHILE the treat is held still THE SYSTEM SHALL animate candlelight climbing both sides of the arch, reaching the
   keystone when the scan fires.
5. WHILE the app is reading THE SYSTEM SHALL sweep a moonbeam across the camera window.
6. WHILE the voice is speaking THE SYSTEM SHALL glow the arch iron in the verdict colour.
7. THE SYSTEM SHALL show a step chip at the foot of the arch naming the current stage in plain language, `aria-hidden`.

---

## Requirement 5: the Open the gate button

**User story:** As a blind user, I want one obvious focused button that starts the camera and sets the visual style
of the whole experience.

1. THE SYSTEM SHALL show a liquid pumpkin pill button labelled "Open the gate" with focus on load.
2. THE SYSTEM SHALL surround the button with a moving ring of light (border beam animation).
3. THE SYSTEM SHALL keep the button's label visible and part of its accessible name (WCAG 2.5.3).
4. WHEN the button is pressed THE SYSTEM SHALL start the camera and animate the gate doors opening (Requirement 4.2).

---

## Requirement 6: layout, bare mode and the desktop window

**User story:** As a low-vision user who zooms in, I want the app to stay usable when the painting no longer fits,
so I am not left with a cropped or broken screen.

1. THE SYSTEM SHALL show the full painting at its natural 1x scale in the Electron desktop app; Cmd + and Cmd -
   SHALL resize the window, the zoom SHALL be remembered between runs, and it SHALL never exceed the screen's work
   area.
2. In a browser THE SYSTEM SHALL scale the painting down uniformly so it fits, to a minimum of 80%.
3. WHEN the viewport is narrower than 600 px, or the scale falls below 80%, THE SYSTEM SHALL enter bare mode:
   the painting is hidden and the screen fills the viewport.
4. In the desktop app THE SYSTEM SHALL always use the full painting (never bare mode), because the window resizes
   instead.
5. THE SYSTEM SHALL keep the screen column in a single order in every layout: status bar, camera window, verdict
   card, dock.
6. THE SYSTEM SHALL use one Electron window the size of the painting (1120 x 920 at the current zoom),
   transparent only outside its rounded corners. There is no separate ghost window and no `setIgnoreMouseEvents`
   call.

---

## Requirement 7: ghosts inside the painting

**User story:** As a sighted companion, I want the ghosts to haunt the air around the phone without covering
anything I need to read, so they add atmosphere without getting in the way.

1. THE SYSTEM SHALL show up to five ghosts materialising, drifting and vanishing in the air on either side of
   the phone: on the left past the mansion, on the right across the moon.
2. Each ghost SHALL drift in the direction it faces (leaning into a climb or dive) and thin to mist before
   vanishing; after a pause it SHALL reappear somewhere else.
3. THE SYSTEM SHALL guarantee through `haunt()` and its unit tests that no ghost covers the phone frame at any
   moment of the animation (start, any point during the drift, or the stretched end frame).
4. THE SYSTEM SHALL guarantee that every ghost stays inside the 1120 x 920 scene at all moments of the animation.
5. Each ghost SHALL glow in the current verdict colour (green, amber, red, or moonlight when no verdict is set).
6. THE SYSTEM SHALL mark all ghost elements `aria-hidden`; they SHALL NOT receive pointer events.
7. WHEN `prefers-reduced-motion` is set THE SYSTEM SHALL render no ghosts at all.
8. `haunt()` SHALL be pure (no DOM, no React imports) and unit tested in `tests/haunt.test.ts` with a seeded PRNG
   that generates thousands of appearances to exercise the boundary conditions.

---

## Requirement 8: design system and fonts

**User story:** As a low-vision user, I want the text to be large, clear and consistent, with an option to switch
to a font designed for low vision.

1. THE SYSTEM SHALL use Geist for interface words and headings, and Inter for reading text (verdict card body,
   allergen chips, settings detail text).
2. ALL text that a user needs to read SHALL be 18px or larger. Key caps and field labels MAY be 16px bold.
3. ALL text SHALL have at least 7:1 contrast against its background on every surface.
4. Surfaces SHALL use a double-bezel pattern: an outer ring and an inner surface lit violet from above.
5. THE SYSTEM SHALL provide an "Easier-to-read letters" switch in Settings that replaces Geist and Inter with
   Atkinson Hyperlegible everywhere (a `hyperlegible` class on `<html>`).
6. THE SYSTEM SHALL apply the font switch immediately on toggle without a page reload.
7. Tiles SHALL have glass icon chips and a light beam that appears on hover and focus.
8. The "Open the gate" button SHALL be a liquid pumpkin pill inside a moving ring of light.

---

## Requirement 9: the island and dock (unchanged behaviour, visual update)

**User story:** As a blind user, I want the island and dock to behave exactly as before while fitting the new
painted-night visual style.

1. WHILE the voice is not speaking THE SYSTEM SHALL show the island as a closed pill; it SHALL be `aria-disabled`
   and not reachable by Tab.
2. WHILE the voice is speaking THE SYSTEM SHALL open the island into a moving waveform with an iridescent glow
   rising behind it, show the label "Stop", and give it Tab focus.
3. WHEN the user taps the island while it is speaking THE SYSTEM SHALL stop the voice immediately.
4. THE SYSTEM SHALL show four dock tiles in a fixed 2 x 2 grid: Repeat (top left), More (top right), Haul (bottom
   left), Settings (bottom right), each at least 64px tall.
5. Each tile SHALL show a glass icon chip and a label; `aria-keyshortcuts` SHALL name the key.
6. THE SYSTEM SHALL add a numeric badge to the Haul tile counting every treat scanned this session.
