# Tasks: hosted web deployment on Cloudflare Workers

## Task 1: Write the spec
- [x] `.kiro/specs/hosted-web/requirements.md`
- [x] `.kiro/specs/hosted-web/design.md`
- [x] `.kiro/specs/hosted-web/tasks.md`

## Task 2: Cloudflare Worker entry point
- [x] Create `worker/index.ts`: lazy singleton `createApp` wired from `env`, client address from
  `CF-Connecting-IP`, `/api/*` routed to handler, everything else to `env.ASSETS.fetch(req)`.

## Task 3: Wrangler configuration
- [x] Create `wrangler.jsonc`: name `trick-or-read`, main `worker/index.ts`, current
  `compatibility_date`, `nodejs_compat` flag, assets `./dist` with SPA fallback and
  `run_worker_first: ["/api/*"]`. No secrets.

## Task 4: Static security headers
- [x] Create `public/_headers` with the `CSP` string from `server/app.ts`, plus
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [x] Create `tests/headers.test.ts` asserting `public/_headers` contains the exact `CSP` export.

## Task 5: package.json scripts
- [x] Add `"deploy:web": "bun run build && wrangler deploy"` to `scripts`.
- [x] Add `"dev:web": "bun run build && wrangler dev"` to `scripts`.

## Task 6: Repository hygiene
- [x] Add `.wrangler/` and `.dev.vars` to `.gitignore`.
- [x] Add Cloudflare Worker secrets documentation to `.env.example`.

## Task 7: Local verification
- [x] Run `bun run build`.
- [x] Start `wrangler dev --local --port 8790` in background.
- [x] `curl /` → 200 + `Content-Security-Policy` header present.
- [x] `curl /api/health` → 200 JSON `{"ok":true,"vision":false,...}`.
- [x] `curl /assets/scene-*.webp` → 200 `content-type: image/webp`.
- [x] `curl -X POST /api/speak -H "Origin: https://evil.example"` → 403.
- [x] Stop wrangler dev.
- [x] `bun test` passes.
- [x] `bun run typecheck` passes.

## Notes from implementation (done outside Kiro after Kiro's usage limit was reached)
- Tasks 2 to 7 were implemented by hand from this spec, with one deliberate change to Requirement 1.7: no fixed
  serverOrigin. The cross-site check compares the Origin's host with the request's Host header, so the same Worker
  works on its workers.dev address and on any custom domain.
- Found in local testing under workerd: "Illegal invocation" when the global fetch was passed around as deps.fetch.
  Fixed in server/app.ts by wrapping it in a plain function (callFetch). Verified locally: /api/speak returns
  ElevenLabs audio and /api/identify returns a real vision read.
