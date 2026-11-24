# Design: release and security

## Current state (verified before this spec was written)

**What is already correct:**

- `bun audit` finds no vulnerabilities.
- No API key appears in `dist/`, `dist-electron/` or in git history.
- `.env` is in `.gitignore` and `.env.*` is excluded, with `.env.example` explicitly re-included.
- API keys are read only on the server side: `server/index.ts` reads environment variables directly;
  `electron/main.ts` reads them through `loadEnv()`. Vite's client build only forwards variables that begin with
  `VITE_`; none of the secret variables use that prefix, so the browser bundle never contains a key.
- `server/app.ts` already sends `x-content-type-options: nosniff`, `referrer-policy: no-referrer` and a
  `permissions-policy` header on every response.
- `/api/identify` and `/api/speak` already have per-client rate limiting (token-bucket, 20 rpm and 60 rpm
  respectively) keyed by IP address.

**Four findings that need to be fixed:**

1. `server/index.ts` binds `0.0.0.0` when `staticDir` is set (`bun run start`). Anyone on the same network can
   call the API and spend the owner's credits.
2. No `Content-Security-Policy` header is set anywhere.
3. `/api/identify` and `/api/speak` accept requests from any website (no cross-origin check). A page on another
   domain can call a self-hosted instance and spend the owner's credits.
4. `electron/main.ts` has no `will-navigate` or `will-attach-webview` guard, and the `setPermissionRequestHandler`
   does not verify that the requesting origin is `app://trick-or-read`.

---

## 1. Server bind address (Requirement 1)

**Change:** in `server/index.ts`, replace the `hostname` logic:

```ts
// Before
hostname: process.env.HOST || (staticDir ? "0.0.0.0" : "127.0.0.1"),

// After
hostname: process.env.HOST || "127.0.0.1",
```

The `0.0.0.0` default was added so `bun run start` could be used as a hosted server without extra configuration.
That convenience is not worth the risk: a developer testing a production build on a laptop would silently expose
their keys. Operators who actually want to host the server set `HOST=0.0.0.0` (or any public address) explicitly.
The startup log already prints the address, so the operator can confirm.

`.env.example` gets a `HOST=` entry with a comment explaining the default.

---

## 2. Content-Security-Policy (Requirement 2)

The CSP is built as a single string constant in `server/app.ts` and added to the headers of every HTML response.
The same string is set in `electron/main.ts` inside the `protocol.handle("app", ...)` callback, on the response for
any path that resolves to `index.html`.

**Policy:**

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
connect-src 'self' https://world.openfoodfacts.org;
img-src 'self' data: blob:;
media-src 'self' blob: data: mediastream:;
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
object-src 'none';
base-uri 'none';
frame-ancestors 'none';
form-action 'self'
```

**Directive rationale:**

| Directive | Reason |
|---|---|
| `script-src 'self' 'wasm-unsafe-eval'` | The ZXing barcode ponyfill compiles WASM at runtime; `'wasm-unsafe-eval'` is the minimal permission for that. `'unsafe-eval'` is not needed. |
| `connect-src https://world.openfoodfacts.org` | The browser fetches label data directly from Open Food Facts (see `tech.md`). No other external fetch is made from the browser. |
| `media-src mediastream:` | `getUserMedia` returns a `MediaStream` object URL; the `<video>` element's `srcObject` is set to it. Chrome requires `mediastream:` in `media-src` for this. |
| `style-src 'unsafe-inline'` | React sets inline styles (`style={{ ... }}` props) on several elements. Removing `'unsafe-inline'` would require refactoring those to CSS variables or class names. |
| `font-src data:` | Atkinson Hyperlegible and Cinzel Decorative are bundled via `@fontsource` and inlined as `data:` URIs by Vite's font plugin. |
| `frame-ancestors 'none'` | Prevents the app from being embedded in an iframe on another site (clickjacking). Must be a header; a `<meta>` tag is ignored for this directive. |
| `base-uri 'none'` | Prevents a `<base>` injection from redirecting relative URL resolution. |

The CSP is not set as a `<meta>` tag in `index.html` because `frame-ancestors` and `form-action` are ignored by
browsers when set that way.

**Testing:** a unit test in `tests/csp.test.ts` calls `createApp({ staticDir: "." })` with a stub filesystem,
makes a `GET /` request, and asserts the response `Content-Security-Policy` header matches the expected string.
A second test covers the Electron path by calling `createApp` with no `staticDir` (the Electron in-process path)
and asserting the CSP is absent from JSON responses (only HTML responses get it).

---

## 3. Cross-origin request rejection (Requirement 3)

**Where it goes:** a `crossOriginCheck` helper function at the top of `server/app.ts`, called at the start of the
`/api/identify` and `/api/speak` handlers.

```ts
function crossOriginCheck(req: Request, serverOrigin: string): Response | null {
  const fetchSite = req.headers.get("Sec-Fetch-Site");
  const origin = req.headers.get("Origin");
  if (fetchSite === "cross-site") return forbidden("cross-site fetch");
  if (origin && !origin.startsWith(serverOrigin)) return forbidden("wrong origin");
  return null;
}
```

The `serverOrigin` is `process.env.ORIGIN` when set, otherwise derived from the `Host` header of the first
request. In Electron the in-process caller passes `clientAddress = "desktop"` (already done in `electron/main.ts`);
the check skips requests that arrive without an `Origin` header (which is the case for the in-process call), so
the desktop app is unaffected.

**Global rate cap:** `createApp` gains a `globalPerMinute` option (default `undefined`). When set, a module-level
counter increments on every `/api/identify` request and resets every 60 seconds; a 429 is returned when the cap is
reached. This is wired from `process.env.RATE_LIMIT` in `server/index.ts`.

`.env.example` gets a `RATE_LIMIT=` entry.

**Logging:** a `console.warn` on cross-origin rejection includes the origin so the operator can see abuse in logs.

**Testing:** `tests/cors.test.ts` asserts:
- Requests without `Origin` are allowed.
- Requests with `Origin: http://127.0.0.1:8787` (matching server) are allowed.
- Requests with `Origin: https://evil.example` are rejected with 403.
- Requests with `Sec-Fetch-Site: cross-site` are rejected with 403.
- Requests with `Sec-Fetch-Site: same-origin` are allowed regardless of `Origin`.

---

## 4. Electron navigation and permission guards (Requirement 4)

All changes are in `electron/main.ts` inside `createWindow()`.

**Navigation guard:**

```ts
win.webContents.on("will-navigate", (event, url) => {
  if (!url.startsWith("app://trick-or-read/")) event.preventDefault();
});
```

The same handler is applied to `ghosts.webContents` inside `createGhosts()`. This catches any `location.href`
assignment or `<a>` click that would navigate away from the app origin.

**Webview guard:**

```ts
app.on("web-contents-created", (_e, wc) => {
  wc.on("will-attach-webview", (event) => event.preventDefault());
});
```

Using `web-contents-created` catches all webviews regardless of which window creates them.

**Permission origin check:**

```ts
session.defaultSession.setPermissionRequestHandler((wc, permission, done) => {
  const origin = new URL(wc.getURL()).origin;
  done(permission === "media" && origin === "app://trick-or-read");
});
session.defaultSession.setPermissionCheckHandler((wc, permission) => {
  const origin = new URL(wc.getURL()).origin;
  return permission === "media" && origin === "app://trick-or-read";
});
```

The existing handlers grant `media` to any `webContents`; adding the origin check ensures that a rogue page loaded
into a secondary window (if one were somehow created) could not silently acquire the camera.

**`setWindowOpenHandler` on the ghost window:** the ghost window already has no interactive content, but adding a
`setWindowOpenHandler(() => ({ action: "deny" }))` on `ghosts.webContents` makes the intent explicit and future-proof.

---

## 5. Prebuilt installers and GitHub Release (Requirement 5)

**electron-builder configuration:** a new `electron-builder.yml` at the repo root defines:

```yaml
appId: com.kiroweem.trick-or-read
productName: Trick or Read
directories:
  output: release/
files:
  - dist/**
  - dist-electron/**
  - package.json
mac:
  target:
    - target: dmg
      arch: [arm64, x64]
win:
  target:
    - target: nsis
      arch: [x64]
linux:
  target:
    - target: AppImage
      arch: [x64]
```

No code-signing configuration is included. The README documents the first-open steps for unsigned apps.

**GitHub Actions workflow:** `.github/workflows/release.yml` runs on `push` to tags `v*.*.*`:

1. Check out the repo.
2. Install Bun.
3. `bun install`.
4. `bun run build:desktop` (Vite + Bun bundler for `electron/main.ts` and `preload.ts`).
5. Run `electron-builder` on macOS, Windows and Linux runners in parallel using a matrix strategy.
6. Upload all artefacts from `release/` to the GitHub Release created by `softprops/action-gh-release`.

No API keys are present in the workflow; the bundle contains no keys by design.

**User-data `.env`:** `electron/main.ts` already loads `join(app.getPath("userData"), ".env")` as the second path
in `loadEnv()`. The README documents the platform-specific paths:

- macOS: `~/Library/Application Support/Trick or Read/.env`
- Windows: `%APPDATA%\Trick or Read\.env`
- Linux: `~/.config/Trick or Read/.env`

---

## 6. Source quick-start (Requirement 6)

The existing README "Run it" section is replaced with a fuller "Run from source" section. It covers:

- Prerequisites: Bun ≥ 1.x, a device with a camera.
- Five commands: `bun install`, `cp .env.example .env`, edit `.env`, `bun run dev`, then optionally `bun run app`
  for the desktop build.
- A note that the app works without keys (barcodes + browser voice).
- The desktop app key path, referencing the user-data folder paths documented above.
- First-open instructions for unsigned installers (macOS quarantine, Windows SmartScreen).

`.env.example` gains `HOST=` and `RATE_LIMIT=` entries with comments.

---

## 7. CI workflow (Requirement 7)

`.github/workflows/ci.yml` runs on `push` to any branch and on `pull_request`:

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - run: bun install --frozen-lockfile
      - run: bun test
      - run: bun run typecheck
```

`--frozen-lockfile` catches accidental `bun.lock` drift. The check runs in well under two minutes on a warm cache;
`setup-bun` caches the Bun binary automatically.

---

## 8. Repository security hygiene (Requirement 8)

These are repository settings, not code changes.

**Secret scanning + push protection:** enabled in the repository's Security → Code security settings. GitHub's
built-in secret patterns cover all three key formats used (Anthropic, fal.ai, ElevenLabs). Push protection blocks
the push before it reaches the remote; the developer must remove the secret before retrying.

**Dependabot alerts:** enabled in the same settings panel. No auto-merge PRs are configured; the owner reviews
each alert.

**SECURITY.md:** a new file at the repo root with:
- How to report a vulnerability (GitHub private vulnerability reporting, or email).
- A one-paragraph explanation of key handling: keys are environment variables read only in the server process or the
  Electron main process; they are never compiled into the browser bundle, never committed, and never logged.
- A note that the app works without keys so users are not encouraged to share keys.

---

## How the findings are resolved

| Finding | Resolution |
|---|---|
| 1 — `0.0.0.0` default bind | `server/index.ts`: default changed to `127.0.0.1`; `HOST` env var required for `0.0.0.0` |
| 2 — no CSP | `server/app.ts` and `electron/main.ts`: CSP header on every HTML response |
| 3 — cross-origin API calls | `server/app.ts`: `crossOriginCheck` before identify and speak handlers; optional `RATE_LIMIT` global cap |
| 4 — no navigation/permission guards | `electron/main.ts`: `will-navigate`, `will-attach-webview`, and permission-origin checks |
