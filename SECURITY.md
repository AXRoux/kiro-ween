# Security

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/AXRoux/kiro-ween/security/advisories/new) on the
AXRoux/kiro-ween repository (Security tab, "Report a vulnerability"). Please do not open a public issue for
security problems.

## Scope

In scope: the API server, the Electron main process, key handling, the Content-Security-Policy, and the
cross-origin checks. Out of scope: the third-party services the app calls (Open Food Facts, fal.ai, Anthropic,
ElevenLabs), and theoretical issues that require physical access to a device already running the app as the
authenticated user.

## How API keys are handled

API keys (FAL_KEY, ANTHROPIC_API_KEY, ELEVENLABS_API_KEY) are read from environment variables in the server
process or the Electron main process only. They are never compiled into the browser bundle, never sent to the
page, never logged, and never committed to git. The `.env` file is excluded from the electron-builder bundle
by the `!.env` rule in `electron-builder.yml`. Without any keys the app works in barcode-only mode (Open Food
Facts + browser speech), so users are not pressured to share keys.

In the desktop app, keys go in a `.env` file in the OS user-data folder
(`~/Library/Application Support/Trick or Read/.env` on macOS,
`%APPDATA%\Trick or Read\.env` on Windows,
`~/.config/Trick or Read/.env` on Linux).
They are read once at startup by `loadEnv()` in `electron/main.ts` and held in `process.env` for the duration
of the session. They are never forwarded to the renderer process.

## Hardening

- **Local by default.** The server binds to `127.0.0.1` unless `HOST=0.0.0.0` is set explicitly.
- **Same-origin enforcement.** Every `/api/` call is rejected with 403 when `Origin` does not match the server
  origin or `Sec-Fetch-Site` is `cross-site`.
- **Rate limiting.** Each client gets at most 20 wrapper reads and 60 voice clips a minute. For a hosted copy,
  `RATE_LIMIT` adds an optional cap on wrapper reads per minute across all clients.
- **Content-Security-Policy.** Every HTML response from the server and from the Electron `app://` protocol
  handler carries a strict CSP that blocks inline scripts, restricts `connect-src` to the app's own origin
  and the services it calls, and sets `frame-ancestors 'none'`.
- **Navigation guard.** The Electron main window and ghost window both block `will-navigate` events to any
  URL outside `app://trick-or-read/`. `setWindowOpenHandler` returns `deny` on both windows. `webview` tags
  are blocked globally via `will-attach-webview`.
- **Camera permission.** `setPermissionRequestHandler` and `setPermissionCheckHandler` grant `media` only to
  `app://trick-or-read`. No other window can request the camera or microphone.
