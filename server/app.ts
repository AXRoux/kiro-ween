import { join, normalize } from "node:path";
import { DEFAULT_MODELS, identify, parseDataUrl, type Provider } from "./identify";
import { checkSpeech, createSpeaker } from "./speak";

/**
 * The whole server as one fetch handler, so tests can call it without a socket.
 * POST /api/identify, GET /api/health, and (in production) the built client from dist/.
 */
export interface AppOptions {
  /** Which vision service reads wrappers. */
  provider?: Provider;
  apiKey?: string;
  model?: string;
  fetch?: typeof fetch;
  /** Directory of the built client; omit in development (Vite serves it). */
  staticDir?: string;
  /** ElevenLabs key for the castle's voice. Without it the browser's own voice is used. */
  speechKey?: string;
  /** Requests per client per minute on /api/identify. */
  perMinute?: number;
  /** Requests per client per minute on /api/speak. */
  speechPerMinute?: number;
  /** Take the client address from X-Forwarded-For (only behind a proxy that overwrites it). */
  trustProxy?: boolean;
  now?: () => number;
}

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(self), microphone=(self)",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...SECURITY_HEADERS } });

export function createApp(opts: AppOptions) {
  const provider: Provider = opts.provider ?? "anthropic";
  const model = opts.model || DEFAULT_MODELS[provider];
  const perMinute = opts.perMinute ?? 20;
  const now = opts.now ?? Date.now;
  const speechPerMinute = opts.speechPerMinute ?? 60;
  const speaker = opts.speechKey ? createSpeaker({ apiKey: opts.speechKey, fetch: opts.fetch ?? fetch }) : null;
  const buckets = { identify: new Map<string, number[]>(), speak: new Map<string, number[]>() };

  const limited = (bucket: keyof typeof buckets, client: string, max: number): boolean => {
    const hits = buckets[bucket];
    const t = now();
    const recent = (hits.get(client) ?? []).filter((x) => t - x < 60_000);
    recent.push(t);
    hits.set(client, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < 60_000)) hits.delete(k);
    return recent.length > max;
  };
  const clientOf = (req: Request, clientAddress: string) => (opts.trustProxy && req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()) || clientAddress;

  return async function handle(req: Request, clientAddress = "local"): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/api/health") return json(200, { ok: true, vision: Boolean(opts.apiKey), provider: opts.apiKey ? provider : null, model: opts.apiKey ? model : null, speech: Boolean(speaker) });

    if (url.pathname === "/api/speak") {
      if (req.method !== "POST") return json(405, { error: "method" });
      if (!speaker) return json(503, { error: "no-voice" });
      if (limited("speak", clientOf(req, clientAddress), speechPerMinute)) return json(429, { error: "slow-down" });
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return json(400, { error: "bad-json" });
      }
      const ask = checkSpeech(body);
      if (typeof ask === "string") return json(400, { error: "bad-text", message: ask });
      try {
        const { audio, cached } = await speaker(ask.text, ask.voice);
        return new Response(new Blob([audio as Uint8Array<ArrayBuffer>]), { headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400", "x-cache": cached ? "hit" : "miss", ...SECURITY_HEADERS } });
      } catch (e) {
        console.error("speak failed:", e instanceof Error ? e.message : e);
        return json(502, { error: "upstream" });
      }
    }

    if (url.pathname === "/api/identify") {
      if (req.method !== "POST") return json(405, { error: "method" });
      if (limited("identify", clientOf(req, clientAddress), perMinute)) return json(429, { error: "slow-down", message: "Too many reads. Wait a moment." });
      if (!opts.apiKey) return json(503, { error: "no-key", message: "Wrapper reading is not configured on this server." });
      const length = Number(req.headers.get("content-length") ?? 0);
      if (length > 3 * 1024 * 1024) return json(413, { error: "too-large" });
      let body: { image?: unknown };
      try {
        body = (await req.json()) as { image?: unknown };
      } catch {
        return json(400, { error: "bad-json" });
      }
      const image = parseDataUrl(body.image);
      if (typeof image === "string") return json(400, { error: "bad-image", message: image });
      try {
        const report = await identify(image, { provider, apiKey: opts.apiKey, model, fetch: opts.fetch ?? fetch });
        return json(200, report);
      } catch (e) {
        console.error("identify failed:", e instanceof Error ? e.message : e);
        return json(502, { error: "upstream", message: "The castle got no answer. Try again." });
      }
    }

    if (url.pathname.startsWith("/api/")) return json(404, { error: "not-found" });
    if (!opts.staticDir) return new Response("Not found", { status: 404 });

    // Static client, with the SPA falling back to index.html. Paths cannot escape staticDir.
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = Bun.file(join(opts.staticDir, rel === "/" ? "index.html" : rel));
    const target = (await file.exists()) && !rel.endsWith("/") ? file : Bun.file(join(opts.staticDir, "index.html"));
    const immutable = rel.startsWith("/assets/");
    return new Response(target, {
      headers: { ...SECURITY_HEADERS, "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache" },
    });
  };
}
