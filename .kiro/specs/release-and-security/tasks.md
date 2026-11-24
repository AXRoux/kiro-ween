# Tasks: release and security

## Group 1 — Security hardening (with tests)

- [x] 1.1 Fix default bind address (Req 1)
  - [x] 1.1a In `server/index.ts`, change the `hostname` line to `process.env.HOST || "127.0.0.1"`, removing the
        conditional that produced `0.0.0.0` when `staticDir` was set.
  - [x] 1.1b Add a `HOST=` entry with a one-line comment to `.env.example` explaining that `0.0.0.0` is for
        intentional hosting only.

- [x] 1.2 Add Content-Security-Policy header (Req 2)
  - [x] 1.2a In `server/app.ts`, define a `CSP` string constant with the full policy (default-src, script-src,
        connect-src, img-src, media-src, style-src, font-src, object-src, base-uri, frame-ancestors, form-action).
  - [x] 1.2b Add `"content-security-policy": CSP` to the headers of every response whose `content-type` is
        `text/html` in `server/app.ts` (the static-file handler; the HTML fallback path).
  - [x] 1.2c In `electron/main.ts`, inside the `protocol.handle("app", ...)` callback, add the same
        `content-security-policy` header to any response whose resolved file is `index.html`.
  - [x] 1.2d Write `tests/csp.test.ts`: call `createApp` with a stub `staticDir`, make a `GET /` request, assert
        the `content-security-policy` header matches the expected string exactly. Assert the header is absent on
        `GET /api/health`.

- [x] 1.3 Cross-origin request rejection (Req 3)
  - [x] 1.3a In `server/app.ts`, add a `crossOriginCheck(req, serverOrigin)` helper that returns a 403 `Response`
        when `Sec-Fetch-Site` is `cross-site`, or when `Origin` is present and does not start with `serverOrigin`;
        returns `null` otherwise.
  - [x] 1.3b Determine `serverOrigin` from `process.env.ORIGIN` when set, otherwise from the `Host` request
        header (e.g. `http://127.0.0.1:8787`). Thread it into `createApp` via `AppOptions`.
  - [x] 1.3c Call `crossOriginCheck` at the top of both the `/api/identify` and `/api/speak` handlers, before
        rate-limit or key checks.
  - [x] 1.3d Add a `globalPerMinute?: number` field to `AppOptions`. When set, maintain a module-level rolling
        counter for `/api/identify`; return 429 when the cap is exceeded. Wire it from `process.env.RATE_LIMIT`
        in `server/index.ts`.
  - [x] 1.3e Add a `RATE_LIMIT=` entry with a comment to `.env.example`.
  - [x] 1.3f Write `tests/cors.test.ts` covering: no `Origin` → allowed; matching `Origin` → allowed;
        `Origin: https://evil.example` → 403; `Sec-Fetch-Site: cross-site` → 403;
        `Sec-Fetch-Site: same-origin` → allowed; global cap reached → 429 on the next request.

- [x] 1.4 Electron navigation and permission guards (Req 4)
  - [x] 1.4a In `createWindow()` in `electron/main.ts`, add a `will-navigate` handler on `win.webContents` that
        calls `event.preventDefault()` for any URL that does not start with `app://trick-or-read/`.
  - [x] 1.4b In `createGhosts()`, add the same `will-navigate` handler on `ghosts.webContents`.
  - [x] 1.4c In `app.whenReady()`, add a `web-contents-created` handler on `app` that attaches a
        `will-attach-webview` listener calling `event.preventDefault()` on every new `webContents`.
  - [x] 1.4d Update `session.defaultSession.setPermissionRequestHandler` to also check that
        `new URL(wc.getURL()).origin === "app://trick-or-read"` before granting `media`.
  - [x] 1.4e Update `session.defaultSession.setPermissionCheckHandler` with the same origin check.
  - [x] 1.4f Add `ghosts.webContents.setWindowOpenHandler(() => ({ action: "deny" }))` inside `createGhosts()`.

---

## Group 2 — Packaging and release workflow

- [ ] 2.1 Add electron-builder configuration (Req 5)
  - [ ] 2.1a Create `electron-builder.yml` at the repo root with `appId`, `productName`, `directories.output`,
        `files`, and targets for mac (dmg, arm64 + x64), win (nsis, x64) and linux (AppImage, x64).
  - [ ] 2.1b Add `electron-builder` as a dev dependency (`bun add -D electron-builder`).
  - [ ] 2.1c Add a `"dist:app"` script to `package.json` that runs `bun run build:desktop && electron-builder`.
  - [ ] 2.1d Add `release/` to `.gitignore`.

- [ ] 2.2 GitHub Actions release workflow (Req 5)
  - [ ] 2.2a Create `.github/workflows/release.yml` that triggers on `push` to tags `v*.*.*`.
  - [ ] 2.2b Use a matrix of `macos-latest`, `windows-latest` and `ubuntu-latest` runners.
  - [ ] 2.2c Each matrix job: check out, install Bun (`oven-sh/setup-bun@v2`), `bun install`, `bun run build:desktop`,
        `bun x electron-builder --publish never`, then upload the contents of `release/` as artefacts.
  - [ ] 2.2d Add a final job that depends on all matrix jobs, downloads all artefacts and uses
        `softprops/action-gh-release` to attach them to the Release for the triggering tag.

- [ ] 2.3 CI workflow (Req 7)
  - [ ] 2.3a Create `.github/workflows/ci.yml` that triggers on `push` (all branches) and `pull_request`.
  - [ ] 2.3b Single job on `ubuntu-latest`: checkout, `oven-sh/setup-bun@v2`, `bun install --frozen-lockfile`,
        `bun test`, `bun run typecheck`.
  - [ ] 2.3c Confirm `bun test` and `bun run typecheck` both pass locally before merging.

---

## Group 3 — Documentation

- [ ] 3.1 Expand README (Req 6)
  - [ ] 3.1a Replace the existing "Run it" section with a "Run from source" section listing prerequisites (Bun ≥ 1.x,
        a camera), and all commands in order: `bun install`, `cp .env.example .env`, edit `.env`, `bun run dev`.
  - [ ] 3.1b Add a "Desktop app from source" subsection documenting `bun run app`.
  - [ ] 3.1c Add a "Download a prebuilt installer" section explaining where to find releases on GitHub and listing
        the user-data `.env` paths for macOS, Windows and Linux.
  - [ ] 3.1d Add a "First-open steps" note for unsigned installers: macOS right-click Open or
        `xattr -d com.apple.quarantine <path>`; Windows SmartScreen "More info → Run anyway".
  - [ ] 3.1e Add a note that the app works without keys (barcodes via Open Food Facts, browser voice).

- [ ] 3.2 Expand `.env.example` (Req 6)
  - [ ] 3.2a Add `HOST=` with a comment: `# Bind address. Default 127.0.0.1. Set to 0.0.0.0 to listen on all interfaces for hosted use.`
  - [ ] 3.2b Add `RATE_LIMIT=` with a comment: `# Optional global cap: max requests per minute to /api/identify across all clients. Off by default.`
  - [ ] 3.2c Add `ORIGIN=` with a comment: `# Your server's origin (e.g. https://example.com). Derived from the Host header if not set.`

- [ ] 3.3 Add SECURITY.md (Req 8)
  - [ ] 3.3a Create `SECURITY.md` at the repo root.
  - [ ] 3.3b Include a "Reporting a vulnerability" section: use GitHub's private vulnerability reporting, or email
        the maintainer; expect a response within 72 hours.
  - [ ] 3.3c Include a "How API keys are handled" section: keys are environment variables read only in the server
        process or the Electron main process; they are never compiled into the browser bundle, never committed to
        git, and never logged; without keys the app works in barcode-only mode so users are not encouraged to share
        keys.

---

## Group 4 — Repository security settings

- [ ] 4.1 Enable GitHub secret scanning with push protection on the `AXRoux/kiro-ween` repository (Settings →
      Code security → Secret scanning; tick "Push protection"). Verify by checking the Security tab shows "Secret
      scanning" as active.

- [ ] 4.2 Enable Dependabot vulnerability alerts (Settings → Code security → Dependabot alerts). No auto-merge;
      alerts are reviewed manually.

- [ ] 4.3 Confirm that the `SECURITY.md` created in task 3.3 is visible in the repository's Security tab as the
      security policy (GitHub detects it automatically).
