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
- **Voice:** ElevenLabs through `POST /api/speak`: Serena by default (a young Brazilian woman speaking English, warm
  and relaxed) or Ana (Brazilian, calm and measured), both from the shared voice library,
  cached in memory on the server and per session in the browser. Web Speech `speechSynthesis` only as the fallback.
  `SpeechRecognition` (where available) for voice commands.
  Sound cues are synthesised with Web Audio: no audio files, no licensing.
- **Phones:** the Vibration API for verdict patterns (where it exists), the Screen Wake Lock API while the camera is on.
- **Desktop:** Electron. The `app://` scheme serves the page and the API in-process (no local port). One frameless
  window, transparent only outside its rounded corners, sized to the painting (1120 x 920). Ghosts fly inside the
  painting and are rendered by the same React tree; there is no separate ghost window and no `setIgnoreMouseEvents`
  call. The preload bridge exposes only `close` and `minimize`. The ghost silhouette is traced with potrace from the
  WWII Ghost Army insignia, a US government work in the public domain, without its lightning bolts.
- **No new runtime dependencies** without a reason written in the design doc.

## Commands
- `bun run dev`: API on :8787 and Vite on :5173 together
- `bun test`, `bun run typecheck`, `bun run build`
- `bun run start`: serves `dist/` and the API on one port (production)
