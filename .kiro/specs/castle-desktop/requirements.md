# Requirements: castle desktop

## Introduction

Trick or Read is a phone-shaped web app that wears a stone castle as its case. The same React build runs in a browser
and as an Electron desktop app. This spec covers the costume and the layout: how the case looks and what each element
signals, how a blind user navigates by touch, how the ghosts are handled on the desktop, the vibration patterns, the
screen wake lock, and the ElevenLabs voices.

## Glossary

- **Case:** the stone castle silhouette that wraps the app screen on desktop and wide browsers.
- **Bare mode:** no case; the screen fills the page. Used on phones and when the browser is too narrow or zoomed in.
- **Halo:** the haunted air around the case (110px each side, 32px sky, 8px below) where the ghosts fly.
- **Ghost window:** in the Electron app, a second transparent child window covering the halo area that holds the ghosts and permanently ignores the mouse.
- **Island:** the Dynamic-Island-style pill in the status bar that becomes the Stop control while the voice speaks.
- **Verdict:** one of Safe, Ask someone, Beware (see `product.md`).

---

## Requirement 1: the castle case and its signals

**User story:** As a sighted companion or judge, I want the castle's appearance to reflect what the app is doing, so
I can confirm a result at a glance without reading the screen.

1. WHEN the app loads THE SYSTEM SHALL show a 460 × 880 stone castle with four round turrets (corner bumpers), a
   crenellated wall, a gatehouse at the centre top, ivy on the left side, bats, a cobweb and a moon.
2. WHILE the camera is off THE SYSTEM SHALL show the portcullis down across the camera window and colour the
   gatehouse window and all four arrow slits in a candle-orange idle colour.
3. WHEN the camera opens THE SYSTEM SHALL animate the portcullis winding upward out of view.
4. WHILE the castle is reading THE SYSTEM SHALL flicker the gatehouse window and arrow slits.
5. WHEN the verdict is Safe THE SYSTEM SHALL colour the gatehouse window and arrow slits green.
6. WHEN the verdict is Ask someone THE SYSTEM SHALL colour them amber.
7. WHEN the verdict is Beware THE SYSTEM SHALL colour them red.
8. WHEN no verdict is set THE SYSTEM SHALL colour them in the moonlight idle colour.
9. THE SYSTEM SHALL make all case elements `aria-hidden`; the screen inside the case carries all accessible information.
10. WHILE `prefers-reduced-motion` is set THE SYSTEM SHALL render no ghosts at all; the global rule in `src/styles/global.css` (`* { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important }`) makes every remaining animation and transition finish instantly, the portcullis and candlelight included.

---

## Requirement 2: the camera window as the primary touch target

**User story:** As a blind user holding candy in one hand, I want to find the scan button by touch without looking,
so I can read a treat without help.

1. THE SYSTEM SHALL make the camera window a single `<button>` labelled "Read now" that covers the entire arch area.
2. THE SYSTEM SHALL make the Read button the largest touch target on the screen.
3. WHILE the camera is off THE SYSTEM SHALL disable the Read button.
4. WHILE the treat is held still THE SYSTEM SHALL animate candlelight climbing both sides of the arch from the base
   to the keystone, reaching the keystone when the scan fires.
5. WHILE the castle is reading THE SYSTEM SHALL sweep a moonbeam across the camera window.
6. WHILE the voice is speaking THE SYSTEM SHALL glow the arch in the verdict's colour.
7. THE SYSTEM SHALL show a chip at the foot of the camera window naming the current step in plain language:
   "Hold up a treat, or tap", "Something's there…", "Hold it still…", "Reading the wrapper…", "Tap to read again",
   "Too dark: turn on a light".
8. WHEN auto-scan is off THE SYSTEM SHALL show "Tap to read" instead of the default watching prompt.

---

## Requirement 3: fixed dock tiles

**User story:** As a blind user, I want the four action tiles to be in the same place in every state, so I can reach
them by memory.

1. THE SYSTEM SHALL show four tiles in a fixed 2 × 2 grid: Repeat (top left), More (top right), Haul (bottom left),
   Settings (bottom right).
2. Each tile SHALL be at least 64 px tall and show a label as well as an icon.
3. THE SYSTEM SHALL keep the tiles in the same positions regardless of the current stage or verdict.
4. THE SYSTEM SHALL add a numeric badge to the Haul tile counting every treat scanned this session.
5. Each tile SHALL carry an `aria-keyshortcuts` attribute naming its key (R, M, B, S).

---

## Requirement 4: the Stop island

**User story:** As a blind user, I want to be able to stop the voice at any moment without searching for a button,
so I can interrupt and re-scan.

1. WHILE the voice is not speaking THE SYSTEM SHALL show the island as a closed pill; it SHALL be `aria-disabled`
   and not reachable by Tab.
2. WHILE the voice is speaking THE SYSTEM SHALL open the island into a moving waveform and show the label "Stop";
   it SHALL receive Tab focus.
3. WHEN the user taps or clicks the island while it is speaking THE SYSTEM SHALL stop the voice immediately.
4. The island SHALL carry `aria-keyshortcuts="Escape"` and pressing Escape SHALL have the same effect.
5. THE SYSTEM SHALL mark the waveform bars `aria-hidden`.

---

## Requirement 5: layout — case, bare mode, and desktop

**User story:** As a low-vision user who zooms in, I want the app to stay usable when the castle no longer fits, so
I am not left with a cropped or broken screen.

1. THE SYSTEM SHALL show the case at its natural 1× scale on the desktop app; Cmd+/Cmd− SHALL resize the window and
   the ghosts' window together, the zoom SHALL be remembered between runs, and it SHALL never exceed the screen's
   work area.
2. In a browser THE SYSTEM SHALL scale the case down uniformly so it fits, to a minimum of 80%.
3. WHEN the viewport is narrower than 560 px, or the scale falls below 80%, THE SYSTEM SHALL enter bare mode:
   the case is hidden and the screen fills the viewport height so the dock never scrolls off.
4. In the desktop app THE SYSTEM SHALL always use 1× layout (never bare mode), because the window resizes instead.
5. THE SYSTEM SHALL keep the screen column in a single order in every layout: status bar, camera window, verdict
   card, dock.

---

## Requirement 6: vibration patterns

**User story:** As a user in a loud environment or with the sound off, I want to feel the verdict in my hand, so I
get the answer even when I cannot hear.

1. WHERE the Vibration API is available THE SYSTEM SHALL buzz the verdict: one 60 ms pulse for Safe, two 140 ms
   pulses for Ask someone, three 380 ms pulses for Beware.
2. THE SYSTEM SHALL buzz once (25 ms) when the stillness detector fires, so the user knows a scan is about to start.
3. THE SYSTEM SHALL buzz a short opening pattern (40, 60, 90 ms) when the gate opens.
4. WHERE the Vibration API is unavailable THE SYSTEM SHALL proceed silently; the voice and sound cues carry the verdict.
5. THE SYSTEM SHALL let the user turn vibration off in Settings; the preference SHALL be saved and restored.

---

## Requirement 7: screen wake lock

**User story:** As a blind user scanning a haul, I want the screen to stay on while the camera is running, so the
app does not go dark mid-scan.

1. WHILE the camera is on THE SYSTEM SHALL request a `"screen"` wake lock through the Screen Wake Lock API.
2. WHEN the page is hidden and then becomes visible again THE SYSTEM SHALL re-acquire the wake lock.
3. WHEN the camera is stopped THE SYSTEM SHALL release the lock.
4. WHERE the Screen Wake Lock API is unavailable THE SYSTEM SHALL proceed without it and not throw.

---

## Requirement 8: the castle's voice — Serena and Ana

**User story:** As a user, I want a voice that is easy to understand and pleasant to listen to for a long haul, so
reading treats does not feel mechanical.

1. THE SYSTEM SHALL offer two ElevenLabs voices from the shared voice library: Serena (warm, relaxed, Brazilian
   accent) and Ana (calm, measured, every word clear).
2. THE SYSTEM SHALL cache each clip in memory on the server and in the browser for the session, so repeated phrases
   play instantly.
3. WHEN the user switches voice THE SYSTEM SHALL say the new voice's greeting ("I'm Serena…" / "I'm Ana…").
4. The user SHALL be able to adjust speech rate from 0.6× to 1.6× in Settings.
5. WHEN the server has no ElevenLabs key THE SYSTEM SHALL fall back to `speechSynthesis`, choosing the best
   available English voice; the user SHALL never be left in silence.
6. THE SYSTEM SHALL warm the cache for the greeting and help text immediately after the gate opens.
7. THE SYSTEM SHALL let the user choose "Use my screen reader instead" in Settings; in that mode the castle's voice
   is silent and all output goes through the live region, so nothing is said twice.

---

## Requirement 9: ghosts

**User story:** As a sighted companion, I want the decorative ghosts outside the castle to reflect the current verdict
colour, so I can sense the mood of the reading at a glance.

1. THE SYSTEM SHALL show up to four ghosts materialising, drifting and vanishing in the haunted air outside the
   castle walls.
2. Ghosts at the sides SHALL appear between the halo edge and the turrets; ghosts in the sky SHALL appear in the
   strip above the battlements; none SHALL overlap the castle silhouette.
3. Each ghost SHALL drift in the direction it faces (leaning into a climb or dive) and thin to mist before vanishing;
   after a pause it SHALL reappear somewhere else.
4. Each ghost SHALL glow in the current verdict's colour (green, amber, red, or moonlight when no verdict is set).
5. THE SYSTEM SHALL mark all ghosts `aria-hidden`; they SHALL NOT receive pointer events.
6. WHEN `prefers-reduced-motion` is set THE SYSTEM SHALL render no ghosts at all.

---

## Requirement 10: desktop ghost window

**User story:** As a desktop user, I want clicks in the space beside the castle to reach the desktop below, so the
ghost area never blocks my workflow.

1. IN the Electron app THE SYSTEM SHALL open a second transparent, frameless, shadow-free child window (the ghost
   window) sized to the castle plus the halo: 680 × 920 at the castle's zoom.
2. THE SYSTEM SHALL call `setIgnoreMouseEvents(true)` on the ghost window once at creation and never change it, so
   every click in the ghost area passes through to the desktop.
3. THE SYSTEM SHALL keep the ghost window centred on the castle window as the castle moves or is zoomed.
4. THE SYSTEM SHALL hide the ghost window when the castle is minimised and show it again (without focus) when the
   castle is restored.
5. THE SYSTEM SHALL propagate the current verdict from the castle window to the ghost window via IPC
   (`castle:verdict`), so the ghost glows match the verdict shown in the castle.
6. THE SYSTEM SHALL load the ghost window from the same `app://` scheme as the castle, at the `?ghosts` path, so
   it runs in the same secure context without a local port.
