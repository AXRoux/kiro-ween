---
inclusion: always
---
# Tech

- **Runtime:** Bun for the API server, scripts and tests. Vite + React 19 + TypeScript (strict) for the client.
- **Camera:** `getUserMedia`, rear-facing when available. Frames are downscaled on a canvas before any analysis.
- **Barcodes:** the native `BarcodeDetector` when present, otherwise the `barcode-detector` ponyfill (ZXing WASM),
  served from our own build, never a CDN.
- **Label data:** Open Food Facts (`world.openfoodfacts.org/api/v2/product/<code>.json`), called from the browser.
- **Vision:** `POST /api/identify` on our server. With `FAL_KEY`, Claude Haiku through fal.ai's any-llm vision (the
  schema in the prompt, the JSON re-checked); with `ANTHROPIC_API_KEY`, Anthropic directly with a forced
  `report_candy` tool call. Keys live on the server; the browser never sees them.
- **Testing in a browser:** headless Chrome with `--mute-audio` always (it still plays sound through the speakers).
- **Voice:** ElevenLabs through `POST /api/speak` (George, a warm storyteller, by default; Lily, a velvety medium),
  cached in memory on the server and per session in the browser. Web Speech `speechSynthesis` only as the fallback.
  `SpeechRecognition` (where available) for voice commands.
  Sound cues are synthesised with Web Audio: no audio files, no licensing.
- **No new runtime dependencies** without a reason written in the design doc.

## Commands
- `bun run dev`: API on :8787 and Vite on :5173 together
- `bun test`, `bun run typecheck`, `bun run build`
- `bun run start`: serves `dist/` and the API on one port (production)
