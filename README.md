# Trick or Read

**A talking scrying mirror for blind and low-vision trick-or-treaters.** Hold a candy up to your webcam: the mirror
names it out loud, warns you about *your* allergens, and tells you if the wrapper has been opened.

Built for **Kiroween 2026**, Costume Contest category, with Kiro (see [`.kiro/`](.kiro)).

## How it works

1. **Enter the séance.** One big button: it starts the camera and lets the page speak.
2. **Hold a treat still.** The mirror notices something new in front of it, waits until it stops moving, and reads it.
   No buttons needed (Space reads on demand).
3. **Two ways to know what it is.**
   - A **barcode** in view is looked up in [Open Food Facts](https://world.openfoodfacts.org): real label data, real
     allergen lists.
   - Otherwise a **vision model** reads the wrapper. It also checks whether the wrapper is sealed, which only a camera
     can see.
4. **The spirit speaks** with a natural ElevenLabs voice: the name, the kind, any of your allergens, and the wrapper.
   M says more (ingredients, sugar, calories), R repeats, B lists your haul.

### Never "safe" when we don't know
| Verdict | When |
|---|---|
| **Beware** | one of your allergens is on the label or likely in the candy, or the wrapper is opened, torn or unwrapped |
| **Ask someone** | you have allergens set but there is no allergen label to read, or the read was unsure |
| **Safe** | sealed, and the label lists none of your allergens |

Allergens from a label are said as facts. Allergens the model infers are said as "likely, ask someone to check the label".

## The costume, and what each piece does
| Piece | Job |
|---|---|
| Gilded mirror | frames where to hold the candy; mists while reading, clears when the spirit speaks |
| Four runes (Sense, Still, Scry, Speak) | the step the mirror is on; the Still rune fills while you hold steady |
| Candles and crest gem | the verdict colour: amber idle, ectoplasm green safe, ember ask, blood red beware |
| Talking board | the planchette glides to SAFE, ASK or BEWARE |
| The ghost | glows while the voice speaks, so a helper knows to listen |
| The cauldron | your haul, warnings first |
| Sounds | heartbeat (holding still), bell (read), deep toll (beware), creak (nothing seen), all synthesised |

Every visual signal is also spoken. Screen reader users can switch the spirit off and get everything through their own
reader instead (never both). Atkinson Hyperlegible, designed by the Braille Institute, for everything you read.

## Keys and voice commands
Space scan · R repeat · M more · B haul · S settings · V switch voice · L voice commands · H help · Esc hush.
With voice commands on: "scan", "repeat", "more", "haul", "help", "stop".

## Run it
```sh
bun install
cp .env.example .env     # FAL_KEY (or ANTHROPIC_API_KEY) for wrapper reading, ELEVENLABS_API_KEY for the voice
bun run dev              # http://localhost:5173
```
Without keys it still works: barcodes via Open Food Facts, and the browser's built-in voice.

Production: `bun run build && bun run start` serves the app and the API on one port (`PORT`, default 8787).

```sh
bun test            # verdict rules, safety wording, allergens, stillness detector, server
bun run typecheck
```

## Built with Kiro
- **Spec:** [`.kiro/specs/candy-scanner`](.kiro/specs/candy-scanner): requirements in EARS form, design, tasks.
- **Steering:** product rules (never say safe without knowing), tech, structure, accessibility.
- **Hooks:** an accessibility review on every UI save, unit tests whenever the verdict or wording logic changes, a guard
  on the safety wording, a typecheck when the agent stops.

## Data and privacy
Frames are downscaled to 768 px, sent once per read, and never stored. Label data © Open Food Facts contributors, ODbL.
Logos and product names belong to their owners.

MIT licensed.
