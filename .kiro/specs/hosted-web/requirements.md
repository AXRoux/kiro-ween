# Requirements: hosted web deployment on Cloudflare Workers

## Introduction

The hackathon requires a URL to the working app. This spec covers deploying Trick or Read as a Cloudflare Worker
that serves both the API (`/api/*`) and the built static client from Cloudflare's edge, without changing the
existing Bun and Electron paths.

---

## Requirement 1: Cloudflare Worker entry point

**User story:** As a hackathon judge, I want to open a URL and have the app load and function (at least the
barcode and UI path, with vision and speech if keys are configured), so I can evaluate it without installing anything.

1. WHEN a request arrives at the Worker for a path under `/api/` THE SYSTEM SHALL route it through the existing
   `createApp` handler from `server/app.ts`, forwarding the request and returning the response unchanged.
2. THE SYSTEM SHALL create the `createApp` instance once per isolate, lazily on the first request, so rate-limit
   state persists across requests within the same isolate.
3. WHEN `env.FAL_KEY` is set THE SYSTEM SHALL pass `provider: "fal"` and `apiKey: env.FAL_KEY` to `createApp`;
   otherwise it SHALL pass `provider: "anthropic"` and `apiKey: env.ANTHROPIC_API_KEY`.
4. THE SYSTEM SHALL pass `speechKey: env.ELEVENLABS_API_KEY`, `perMinute: 10`, `speechPerMinute: 40`, and
   `globalPerMinute: env.RATE_LIMIT ? Number(env.RATE_LIMIT) : 60` to `createApp`.
5. THE SYSTEM SHALL derive the client address from the `CF-Connecting-IP` header of the incoming request.
6. WHEN a request arrives for any path not under `/api/` THE SYSTEM SHALL fall through to Cloudflare's static
   asset serving (not handled by Worker code), which serves the built `dist/` directory.
7. THE SYSTEM SHALL pass the Worker's own origin (derived from the request URL) as `serverOrigin` to `createApp`
   so the cross-origin check works correctly from a browser on the production URL.

---

## Requirement 2: Wrangler configuration

1. THE SYSTEM SHALL provide a `wrangler.jsonc` file at the repo root with:
   - `name: "trick-or-read"`
   - `main: "worker/index.ts"`
   - A current `compatibility_date`
   - `assets` configured with `directory: "./dist"`, `not_found_handling: "single-page-application"`, and
     `run_worker_first: ["/api/*"]` so API routes reach the Worker before the asset handler.
2. THE `wrangler.jsonc` SHALL contain no secrets or API keys.
3. THE SYSTEM SHALL use the `nodejs_compat` compatibility flag so `node:path` imports in `server/app.ts` resolve
   without error at bundle time (the static-file branch using `Bun.file` is never executed in the Worker).

---

## Requirement 3: Security headers on static pages

1. THE SYSTEM SHALL provide a `public/_headers` file that Vite copies into `dist/_headers` at build time.
2. THE `_headers` file SHALL apply, for the `/*` path, the same `Content-Security-Policy` value as the `CSP`
   constant exported from `server/app.ts`.
3. THE `_headers` file SHALL also set `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: no-referrer`, and `Permissions-Policy: camera=(self), microphone=(self)`.
4. THE SYSTEM SHALL include a unit test (`tests/headers.test.ts`) that reads `public/_headers` and asserts it
   contains the exact string exported as `CSP` from `server/app.ts`, so the two values cannot drift apart.

---

## Requirement 4: Build and deployment scripts

1. THE `package.json` `scripts` object SHALL include:
   - `"deploy:web": "bun run build && wrangler deploy"` — builds the client and deploys to Cloudflare.
   - `"dev:web": "bun run build && wrangler dev"` — builds the client and starts a local Worker dev server.
2. These scripts SHALL not affect the existing `dev`, `build`, `start`, `test`, `typecheck`, `build:desktop`,
   `app`, or `dist:app` scripts.

---

## Requirement 5: Repository hygiene

1. THE `.gitignore` SHALL include `.wrangler/` (Wrangler's local state directory) and `.dev.vars`
   (Wrangler's local secrets file).
2. THE `.env.example` SHALL document that the Worker reads its secrets via `wrangler secret put` (not `.env`),
   with the commands `wrangler secret put FAL_KEY` and `wrangler secret put ELEVENLABS_API_KEY` shown.

---

## Requirement 6: Local verification without login

1. WHEN `wrangler dev --local` is started with no secrets configured THE SYSTEM SHALL serve static assets and
   the health endpoint, and the vision and speech endpoints SHALL return 503 (no key).
2. `GET /` SHALL return HTTP 200 with a `Content-Security-Policy` header (from the Worker's HTML handling or
   the `_headers` file processed by the asset handler).
3. `GET /api/health` SHALL return HTTP 200 with JSON `{"ok":true,"vision":false,...}`.
4. `GET /assets/<hashed-asset>` SHALL return the correct `Content-Type` for the file type.
5. `POST /api/speak` with `Origin: https://evil.example` SHALL return HTTP 403.
