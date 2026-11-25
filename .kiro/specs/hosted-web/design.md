# Design: hosted web deployment on Cloudflare Workers

## Architecture overview

The app already has a clean separation: `server/app.ts` exports `createApp`, a pure fetch handler with no
Bun-specific runtime calls in the API path. The static-file branch (`Bun.file`) only executes when `staticDir` is
set, which the Worker never sets. That means `createApp` can run verbatim inside a Cloudflare Worker; the Worker
just needs to wire `env` → `AppOptions` and delegate static serving to Cloudflare's asset binding.

```
Request
  │
  ├─ /api/* ──► Worker fetch handler ──► createApp (from server/app.ts)
  │
  └─ /* ──────► Cloudflare Static Assets (dist/) via run_worker_first false for non-/api/
```

## 1. `worker/index.ts`

```ts
import { createApp, type AppOptions } from "../server/app";
import { type Provider } from "../server/identify";

interface Env {
  FAL_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  RATE_LIMIT?: string;
  ASSETS: Fetcher;  // Cloudflare asset binding
}

let app: ReturnType<typeof createApp> | null = null;

function getApp(env: Env): ReturnType<typeof createApp> {
  if (app) return app;
  const provider: Provider = env.FAL_KEY ? "fal" : "anthropic";
  const opts: AppOptions = {
    provider,
    apiKey: provider === "fal" ? env.FAL_KEY : env.ANTHROPIC_API_KEY,
    speechKey: env.ELEVENLABS_API_KEY,
    perMinute: 10,
    speechPerMinute: 40,
    globalPerMinute: env.RATE_LIMIT ? Number(env.RATE_LIMIT) : 60,
  };
  app = createApp(opts);
  return app;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      const serverOrigin = url.origin;
      const handler = getApp(env);
      const clientAddress = req.headers.get("CF-Connecting-IP") ?? "unknown";
      // Pass serverOrigin per-request since it is not known at startup.
      // createApp is called once; serverOrigin is threaded via a closure wrapper.
      return handler(req, clientAddress);
    }
    return env.ASSETS.fetch(req);
  },
};
```

**serverOrigin per request:** `createApp` accepts `serverOrigin` in its options. Since we cannot know the
deployment URL at startup, the Worker derives `serverOrigin` from each request's URL (`url.origin`) and passes
it to the handler. Because `createApp` is called once (the lazy singleton), we cannot bake `serverOrigin` into
it. Instead the Worker wraps `createApp` to inject `serverOrigin` into each call by creating `createApp` with
no `serverOrigin` and relying on the host-header fallback already in `crossOriginCheck`: when `serverOrigin` is
undefined, the check compares the parsed Origin's host against the `Host` header of the request, which is correct
for a Cloudflare Worker (Cloudflare sets the `Host` header to the deployment host).

This means no extra plumbing is needed: the existing host-fallback in `crossOriginCheck` handles it.

## 2. `node:path` compatibility

`server/app.ts` imports `join` and `normalize` from `node:path` at the top level, even though they are only
called in the static-file branch (which the Worker never reaches). Wrangler will refuse to bundle the file unless
`nodejs_compat` is in the `compatibility_flags` list. With that flag, `node:path` is available as a stub in the
Workers runtime.

No changes to `server/app.ts` are needed. Bun and Electron continue to use the real Node `path` module.

## 3. `wrangler.jsonc`

```jsonc
{
  "name": "trick-or-read",
  "main": "worker/index.ts",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  }
}
```

`run_worker_first: ["/api/*"]` tells the asset handler to skip the asset lookup and hand the request to the
Worker code first for any `/api/` path. All other paths (including `/`, `/assets/*`) are served from the asset
binding directly.

## 4. `public/_headers`

Vite copies everything in `public/` into `dist/` at build time. Cloudflare's asset handler reads `dist/_headers`
and applies the rules to static responses.

```
/*
  Content-Security-Policy: <value of CSP from server/app.ts>
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(self), microphone=(self)
```

The CSP value is copied verbatim from the `CSP` constant in `server/app.ts`. A unit test (`tests/headers.test.ts`)
reads `public/_headers` at test time and compares it against the imported `CSP` string.

**Keeping the two in sync:** the test fails if `server/app.ts` changes the CSP without updating `_headers`, which
is the only mechanism needed. Manual copy is acceptable because the CSP changes rarely and the test is the guard.

## 5. `.gitignore` additions

```
.wrangler/
.dev.vars
```

`.wrangler/` is Wrangler's local cache (miniflare KV, D1 state, local worker registry). `.dev.vars` is the
Wrangler convention for local secrets (analogous to `.env`). Both are already ignored patterns-compatible with
the existing `.env` exclusion.

## 6. `.env.example` additions

```
# ── Cloudflare Worker (wrangler deploy / wrangler dev) ──────────────────────
# The Worker reads its secrets from Wrangler, not from .env.
# Set them once with:
#   wrangler secret put FAL_KEY
#   wrangler secret put ANTHROPIC_API_KEY
#   wrangler secret put ELEVENLABS_API_KEY
# For local wrangler dev, put them in .dev.vars (same KEY=value format, never commit it).
```

## 7. Local test procedure

```sh
bun run build
wrangler dev --local --port 8790 &
sleep 3
curl -si http://localhost:8790/                          # 200 + CSP header
curl -si http://localhost:8790/api/health                # 200 + {"ok":true}
curl -si http://localhost:8790/assets/scene-*.webp       # 200 + content-type: image/webp
curl -si -X POST http://localhost:8790/api/speak \
  -H "Origin: https://evil.example" \
  -H "content-type: application/json" \
  -d '{"text":"hi"}' | head -5                           # 403
kill %1
```

## Decision record

**Why not change `server/app.ts` to avoid the `node:path` import?**
The `Bun.file` static path is correct Bun code and is tested. Changing it to conditionally import `node:path`
would add complexity and risk breaking the Bun or Electron paths. The `nodejs_compat` flag is the idiomatic
Cloudflare solution and costs nothing.

**Why not use `serverOrigin` in the Worker?**
Cloudflare Workers can be deployed under custom domains. Hardcoding the origin at deploy time would break any
custom domain. The existing host-header fallback in `crossOriginCheck` handles both the default
`*.workers.dev` domain and any custom domain without configuration.

**Why `run_worker_first` instead of a catch-all?**
Cloudflare's asset handler is optimised for static files and handles ETags, range requests, and proper
content-type sniffing automatically. Having the Worker only intercept `/api/*` keeps the static path fast and
avoids manually streaming assets through the Worker.
