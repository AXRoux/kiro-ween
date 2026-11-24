# Requirements: release and security

## Introduction

This spec covers two goals that must be met before Trick or Read is shared publicly.

**Goal A — Download and run:** anyone who finds the GitHub repo can get the app working in under ten minutes, with
a written path for every platform. Prebuilt desktop installers for macOS, Windows and Linux are attached to GitHub
Releases so users who do not want to build from source never need to.

**Goal B — Secure API surface:** the API keys the owner supplies are never leaked through the network, the build
artefacts or git history; every exposed HTTP surface is locked down; and the Electron app does not let a rogue page
escalate privileges.

---

## Requirement 1: server bind address

**User story:** As a developer running `bun run start` on a laptop on a shared Wi-Fi network, I want the server to
listen only on localhost by default, so my API keys cannot be called by others on the same network.

1. WHEN `bun run start` is run without a `HOST` environment variable THE SYSTEM SHALL bind the HTTP server to
   `127.0.0.1` only.
2. WHEN the `HOST` environment variable is set THE SYSTEM SHALL bind to that address, allowing `0.0.0.0` for
   intentional hosting.
3. THE SYSTEM SHALL log the actual hostname and port that the server is listening on so the operator can confirm
   the bind address.

---

## Requirement 2: Content-Security-Policy

**User story:** As a user running the web app, I want the browser to enforce what scripts and connections are allowed,
so a compromised dependency or injected content cannot exfiltrate data or run code I did not ship.

1. THE SYSTEM SHALL serve a `Content-Security-Policy` header on every HTML response.
2. The policy SHALL include `default-src 'self'`.
3. The policy SHALL include `script-src 'self' 'wasm-unsafe-eval'` to allow the WASM barcode reader.
4. The policy SHALL include `connect-src 'self' https://world.openfoodfacts.org` to allow label lookups.
5. The policy SHALL include `img-src 'self' data: blob:`.
6. The policy SHALL include `media-src 'self' blob: data: mediastream:` for audio playback and the camera stream.
7. The policy SHALL include `style-src 'self' 'unsafe-inline'` for React inline style attributes.
8. The policy SHALL include `font-src 'self' data:`.
9. The policy SHALL include `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, and
   `form-action 'self'`.
10. THE SYSTEM SHALL apply the same policy in the Electron app via the `app://` protocol handler for HTML responses.
11. THE SYSTEM SHALL NOT set the CSP as a `<meta>` tag; it must be a response header so `frame-ancestors` is honoured
    by the browser.

---

## Requirement 3: cross-origin request rejection

**User story:** As an operator who self-hosts Trick or Read, I want the API to reject requests that come from other
websites, so my API keys cannot be spent by a third-party page that calls my server.

1. WHEN a request to `/api/identify` or `/api/speak` carries an `Origin` header that does not match the server's
   own origin THE SYSTEM SHALL respond with `403 Forbidden`.
2. WHEN a request to `/api/identify` or `/api/speak` carries a `Sec-Fetch-Site` header with a value of
   `cross-site` THE SYSTEM SHALL respond with `403 Forbidden`.
3. THE SYSTEM SHALL allow requests that carry no `Origin` header (server-to-server, curl, Electron in-process).
4. THE SYSTEM SHALL allow requests whose `Origin` matches the server's own origin (same-site browser requests).
5. WHEN the `RATE_LIMIT` environment variable is set to a positive integer THE SYSTEM SHALL allow at most that many
   requests per minute across all clients on `/api/identify`, returning `429` when the cap is reached; by default
   this global cap SHALL be disabled.
6. THE SYSTEM SHALL log a one-line warning when a cross-origin request is rejected, naming the origin.

---

## Requirement 4: Electron navigation and permission guards

**User story:** As a user running the desktop app, I want the app to refuse to open untrusted pages inside its
window, so a malicious link cannot run code in the privileged Electron context or silently access my camera.

1. THE SYSTEM SHALL attach a `will-navigate` handler on the castle window's `webContents` that cancels any
   navigation whose target URL is not `app://trick-or-read/`.
2. THE SYSTEM SHALL attach a `will-navigate` handler on the ghost window's `webContents` with the same rule.
3. THE SYSTEM SHALL attach a `will-attach-webview` handler that cancels every `<webview>` attachment.
4. THE SYSTEM SHALL prevent new browser windows from opening inside the app process for any URL scheme other than
   `app:` (the existing `setWindowOpenHandler` already opens `http:`/`https:` in the default browser and denies all
   others; this requirement formalises it and extends it to both windows).
5. THE SYSTEM SHALL guard the `setPermissionRequestHandler` so it only grants the `media` permission when the
   requesting `webContents` is loading an `app://trick-or-read` URL.
6. THE SYSTEM SHALL guard the `setPermissionCheckHandler` with the same origin check.

---

## Requirement 5: prebuilt installers and GitHub Release

**User story:** As a blind or low-vision user (or their carer) who is not a developer, I want to download a
ready-to-run app for my computer, so I can start reading candy without installing Bun or Node.

1. THE SYSTEM SHALL publish prebuilt desktop installers for macOS (DMG, arm64 and x64), Windows (NSIS installer,
   x64) and Linux (AppImage, x64) on every GitHub Release.
2. Installers SHALL be built by a GitHub Actions workflow that triggers on a tag matching `v*.*.*`.
3. The workflow SHALL run `bun run build:desktop` and then `electron-builder` to produce the platform artefacts.
4. THE SYSTEM SHALL attach all produced artefacts to a GitHub Release created for the triggering tag.
5. Installed apps SHALL contain no API keys; users SHALL supply their own keys in a `.env` file in the app's
   user-data folder (macOS `~/Library/Application Support/Trick or Read/.env`, Windows
   `%APPDATA%\Trick or Read\.env`, Linux `~/.config/Trick or Read/.env`).
6. Without any keys the installed app SHALL still work: barcode scanning via Open Food Facts and the browser's
   built-in voice.

---

## Requirement 6: source quick-start

**User story:** As a developer or contributor, I want to be able to run Trick or Read from source in under ten
minutes using a single README section, so I do not have to hunt across multiple files.

1. THE README SHALL contain a "Run from source" section listing every prerequisite (Bun ≥ 1.x, a camera) and every
   command in order: `bun install`, `cp .env.example .env`, edit `.env`, `bun run dev`.
2. THE README SHALL state that wrapper reading and ElevenLabs voice require keys but that the app works without them.
3. THE README SHALL document how to run the desktop app from source (`bun run app`).
4. THE README SHALL document the user-data `.env` path for each platform for installed apps.
5. THE README SHALL include first-open instructions for unsigned installers: macOS right-click Open (or
   `xattr -d com.apple.quarantine`), Windows SmartScreen "More info → Run anyway".
6. THE `.env.example` file SHALL document every supported environment variable with a one-line comment.

---

## Requirement 7: CI

**User story:** As a contributor opening a pull request, I want to know that the tests and typecheck pass before
merging, so I do not break the main branch.

1. THE SYSTEM SHALL run `bun test` and `bun run typecheck` on every push and on every pull-request event via a
   GitHub Actions workflow.
2. The CI workflow SHALL fail the check and block the merge if either command exits with a non-zero code.
3. THE SYSTEM SHALL cache the Bun installation and `node_modules` to keep the check under two minutes on a warm run.

---

## Requirement 8: repository security hygiene

**User story:** As the repository owner, I want the standard GitHub security features enabled so I learn about
leaked keys or vulnerable dependencies quickly.

1. THE REPOSITORY SHALL have GitHub secret scanning enabled with push protection, so a commit that contains an API
   key is blocked before it reaches the remote.
2. THE REPOSITORY SHALL have Dependabot vulnerability alerts enabled.
3. THE REPOSITORY SHALL contain a `SECURITY.md` file at the root that explains how to report a security issue
   privately and how API keys are handled (server-only, never in the bundle, never in git history).
