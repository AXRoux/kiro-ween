# Design: candy scanner

## Overview
A single-page app with a small Bun API. The browser owns the camera, barcode reading, label lookup, speech and sound.
The server owns one thing: the vision call, so the Anthropic key never reaches a browser.

```
 webcam ──▶ Motion (stillness) ──▶ scan()
                                   ├─ Barcode ──▶ Open Food Facts ──┐
                                   └─ (no code) ─▶ /api/identify ───┤
                                                                     ▼
                       Reading ──▶ verdict() ──▶ phrase() ──▶ Voice + Announcer + SpiritBoard + Haul
```

## The scan state machine (App.tsx)
`gate → watching → sensing → still → scrying → speaking → watching`, plus `error`. The four runes around the mirror
(Sense, Still, Scry, Speak) light for the matching state, so a sighted companion can see what the mirror is doing.

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
| `lib/voice.ts` | browser | speechSynthesis queue, "spirit" voice preset, speaking events for the Ghost |
| `lib/sounds.ts` | browser | Web Audio cues: heartbeat (sensing), chime (found), toll (beware), creak (nothing seen) |
| `lib/listen.ts` | browser | SpeechRecognition commands where supported |

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
| Element | Function |
|---|---|
| Gilded mirror around the video | shows exactly where to hold the candy; the glass mists while scrying and clears when it speaks |
| Four runes on the frame | the pipeline step, readable without audio |
| Two candles | the verdict colour: amber idle, ectoplasm green safe, ember orange ask someone, blood red beware |
| Spirit board with a planchette | the verdict as a word the planchette glides to: SAFE, ASK, BEWARE |
| The ghost | glows and breathes while the voice is speaking, so a companion knows to listen |
| The haul (a cauldron) | the running list, warnings marked |
| Fog, embers, trees, bats | atmosphere only, `aria-hidden`, off under reduced motion |

## Type
Cinzel Decorative for the title, Cinzel for labels, Atkinson Hyperlegible (designed by the Braille Institute for low
vision) for everything a person must read.

## Error handling
- Camera denied → spoken instructions, a retry button.
- Open Food Facts down or unknown code → fall through to the vision read.
- `/api/identify` without a key → 503 with a message; the app says barcode scanning still works.
- Speech synthesis missing → the Announcer still updates for screen readers.
