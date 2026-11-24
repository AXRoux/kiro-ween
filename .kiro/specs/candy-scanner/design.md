# Design: candy scanner

## Overview
A single-page app with a small Bun API. The browser owns the camera, barcode reading, label lookup, speech and sound.
The server owns one thing: the vision call, so the Anthropic key never reaches a browser.

```
 webcam ──▶ Motion (stillness) ──▶ scan()
                                   ├─ Barcode ──▶ Open Food Facts ──┐
                                   └─ (no code) ─▶ /api/identify ───┤
                                                                     ▼
                       Reading ──▶ verdict() ──▶ phrase() ──▶ Voice + Announcer + Verdict card + Haptics + Haul
```

## The scan state machine (App.tsx)
`gate → watching → sensing → still → reading → speaking → watching`, plus `dark`. The chip at the foot of the camera
window names the step, and candlelight climbs the arch while the treat is held still, so a sighted companion can see
what the castle is doing.

## Modules
| Module | Kind | Responsibility |
|---|---|---|
| `lib/types.ts` | pure | `Reading` (one shape for label data and vision reads), `Verdict`, `Allergen` |
| `lib/allergens.ts` | pure | the allergen list, synonyms, matching Open Food Facts tags and model words to it |
| `lib/verdict.ts` | pure | Safe / Ask someone / Beware from a Reading and the user's allergens (Requirement 5) |
| `lib/phrasing.ts` | pure | what to say: summary, details, haul, guidance (Requirement 4, 7) |
| `lib/motion.ts` | pure | frame difference and brightness on a 64×48 luma buffer; the stillness detector (Requirement 2) |
| `lib/haul.ts` | pure | add and summarise |
| `lib/camera.ts` | browser | stream, frame capture to a canvas, JPEG at 768px |
| `lib/barcode.ts` | browser | native detector or ponyfill, EAN/UPC only |
| `lib/openfoodfacts.ts` | browser | lookup and normalise to `Reading` |
| `lib/identify.ts` | browser | POST a frame, normalise to `Reading` |
| `lib/voice.ts` | browser | ElevenLabs clips (Serena, Ana) with speechSynthesis as fallback, speaking events for the island |
| `lib/sounds.ts` | browser | Web Audio cues: ratchet (gate), heartbeat (sensing), chime (found), toll (beware), creak (nothing seen) |
| `lib/listen.ts` | browser | SpeechRecognition commands where supported |
| `lib/haptics.ts` | browser | vibration patterns per verdict (counted, not just felt) where the Vibration API exists |
| `lib/wakelock.ts` | browser | keeps a phone's screen on while the camera is on |

## The vision contract
The server forces a tool call `report_candy` with this input schema (validated again on the server):
`seen, name, brand, kind, flavor, size, allergens[{name, certainty: listed|likely}], wrapper
(sealed|opened|torn|unwrapped|unknown), confidence 0..1, guidance`.
Allergens the model sees printed on the wrapper are `listed`; ones it infers from the product are `likely`.

## Verdict rules (from product.md)
1. Wrapper opened, torn or unwrapped → **Beware**.
2. Any of the user's allergens listed (label data or printed on the wrapper) → **Beware**.
3. Any of the user's allergens likely → **Beware** (said as "likely").
4. No label data and the user has allergens set, or confidence below 0.6 → **Ask someone**.
5. Otherwise → **Safe**.

## The costume, and what each part does
A phone-sized app wearing a stone castle for a case. The app is designed for touch first; the castle is costume that
also carries state.

| Element | Function |
|---|---|
| The case | a stone wall with round corner turrets (the bumpers), battlements and a gatehouse; in the desktop app it is the window's silhouette, dragged by its stone |
| Gatehouse window and arrow slits | the verdict colour: moonlight idle, green safe, amber ask someone, red beware; candle-orange before the gate opens; they flicker while reading |
| Portcullis | down across the camera window until the gate is opened; winds up when the camera starts |
| Camera window (Arch) | a pointed stone arch around the video. The whole window is the Read button. Corner brackets show where to hold the treat; candlelight climbs both sides of the arch while the treat is held still and meets at the keystone; a moonbeam sweeps while reading; the arch glows the verdict colour while speaking. A chip at its foot names the step |
| Island (StatusBar) | a black pill like the Dynamic Island: opens into a wave and a "Stop" label while the voice speaks; tapping it stops the voice. Green and orange dots show camera and microphone, as on a phone |
| Verdict card | the verdict as a solid block with an icon, the word and the reason, then the name and facts (scrolls inside) |
| Dock | four 64px tiles in fixed places: Repeat, More, Haul (with a count), Settings |
| Haul and Settings | bottom sheets with grouped rows, like a phone's settings |
| Ghosts | the WWII "Ghost Army" insignia's ghost (traced, without its lightning; `ghostShape.ts`); appear at random spots in the air outside the walls (a 110px margin at the sides, 32px of sky), drift and vanish; glow in the verdict colour; never take a click; off under reduced motion |
| Ivy, bats, cobweb, moon, nameplate | costume only (`aria-hidden`); bats stop under reduced motion |

## Layout
The case is a 460 x 880 canvas; the screen inside it is 392 x 752 at (34, 62). In the desktop app the castle's window is exactly the case
and always takes clicks; the ghosts fly in a second transparent window (680 x 920, centred on it) that is attached to
it and permanently ignores the mouse, so no click-through has to be switched on and off. The screen is one column: status bar,
camera window, verdict card (takes what is left, scrolls inside), dock. On a phone, or when the browser is too small for
the case at 80% scale (zoomed in), the case is left off and the screen fills the page, pinned to the viewport height
so the dock never moves.

## Type
Atkinson Hyperlegible (designed by the Braille Institute for low vision) for every word a person reads: headings,
buttons, verdicts, facts. Cinzel Decorative only on the carved, aria-hidden nameplate. Fonts are
bundled with `@fontsource`, never fetched from a CDN. Type scale 16 / 18 / 20 / 24 / 30 px; spacing on an 8px grid; 14 and 22px radii, like a phone's.

## Error handling
- Camera denied → spoken instructions, a retry button.
- Open Food Facts down or unknown code → fall through to the vision read.
- `/api/identify` without a key → 503 with a message; the app says barcode scanning still works.
- Speech synthesis missing → the Announcer still updates for screen readers.
