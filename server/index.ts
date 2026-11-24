import { join } from "node:path";
import { existsSync } from "node:fs";
import { createApp } from "./app";
import { DEFAULT_MODELS, type Provider } from "./identify";

const port = Number(process.env.PORT || 8787);
const dist = join(import.meta.dir, "..", "dist");
const staticDir = existsSync(join(dist, "index.html")) && process.env.NODE_ENV !== "development" ? dist : undefined;
// fal.ai when FAL_KEY is set (Claude Haiku through fal's any-llm vision), otherwise Anthropic directly.
// VISION_PROVIDER=anthropic|fal forces one.
const provider = (process.env.VISION_PROVIDER as Provider | undefined) ?? (process.env.FAL_KEY ? "fal" : "anthropic");
const apiKey = provider === "fal" ? process.env.FAL_KEY : process.env.ANTHROPIC_API_KEY;
const model = process.env.CANDY_MODEL || DEFAULT_MODELS[provider];
const handle = createApp({
  provider,
  apiKey,
  model,
  speechKey: process.env.ELEVENLABS_API_KEY,
  staticDir,
  trustProxy: process.env.TRUST_PROXY === "1",
});

const server = Bun.serve({
  port,
  hostname: process.env.HOST || (staticDir ? "0.0.0.0" : "127.0.0.1"),
  maxRequestBodySize: 3 * 1024 * 1024,
  fetch: (req, srv) => handle(req, srv.requestIP(req)?.address ?? "unknown"),
});

console.log(
  `trick-or-read api http://${server.hostname}:${server.port}  ·  wrapper reading ${apiKey ? `on (${provider}: ${model})` : `OFF (no ${provider === "fal" ? "FAL_KEY" : "ANTHROPIC_API_KEY"}): barcodes only`}  ·  voice ${process.env.ELEVENLABS_API_KEY ? "ElevenLabs (Serena, Ana)" : "browser speech (no ELEVENLABS_API_KEY)"}${staticDir ? "  ·  serving dist/" : ""}`,
);
