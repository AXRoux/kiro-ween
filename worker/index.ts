/**
 * Trick or Read on Cloudflare Workers: the hosted web version (spec: .kiro/specs/hosted-web).
 * /api/* goes through the same createApp handler as the Bun server and the desktop app; everything else is the built
 * client (dist/), served by Cloudflare's static assets with the headers in public/_headers.
 *
 * Keys are Worker secrets (wrangler secret put FAL_KEY, ELEVENLABS_API_KEY), never in the repo or the page.
 * Per-client limits are tighter than the local server's, and a global cap (RATE_LIMIT, default 60 reads a minute)
 * protects the owner's credits from anyone who finds the URL.
 */
import { createApp } from "../server/app";
import { DEFAULT_MODELS, type Provider } from "../server/identify";

export interface Env {
  FAL_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  VISION_PROVIDER?: string;
  CANDY_MODEL?: string;
  RATE_LIMIT?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/** One app per isolate, so rate limits persist between requests. */
let app: ReturnType<typeof createApp> | null = null;

function appFor(env: Env) {
  const provider: Provider = env.VISION_PROVIDER === "anthropic" || env.VISION_PROVIDER === "fal" ? env.VISION_PROVIDER : env.FAL_KEY ? "fal" : "anthropic";
  return createApp({
    provider,
    apiKey: provider === "fal" ? env.FAL_KEY : env.ANTHROPIC_API_KEY,
    model: env.CANDY_MODEL || DEFAULT_MODELS[provider],
    speechKey: env.ELEVENLABS_API_KEY,
    perMinute: 10,
    speechPerMinute: 40,
    globalPerMinute: Number(env.RATE_LIMIT) > 0 ? Number(env.RATE_LIMIT) : 60,
    // No fixed serverOrigin: the cross-site check compares the Origin's host with the request's Host header, so the
    // same Worker works on its workers.dev address and on any custom domain.
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    app ??= appFor(env);
    return app(request, request.headers.get("CF-Connecting-IP") ?? "unknown");
  },
};
