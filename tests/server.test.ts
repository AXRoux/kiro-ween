import { describe, expect, it } from "bun:test";
import { createApp } from "../server/app";
import { parseDataUrl, SYSTEM, TOOL, toReport } from "../server/identify";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const post = (body: unknown) => new Request("http://x/api/identify", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

/** A fake Anthropic that answers with the given tool input and records what it was sent. */
function fakeModel(input: unknown, status = 200) {
  const sent: any[] = [];
  const fetch = (async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ content: [{ type: "tool_use", name: "report_treat", input }] }), { status });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, sent };
}

describe("parseDataUrl", () => {
  it("accepts a JPEG or PNG data URL and rejects anything else", () => {
    expect(typeof parseDataUrl(PNG)).toBe("object");
    expect(parseDataUrl("data:image/gif;base64,R0lGOD")).toMatch(/JPEG or PNG/);
    expect(parseDataUrl("https://example.com/a.png")).toMatch(/JPEG or PNG/);
    expect(parseDataUrl(42)).toMatch(/string/);
  });
  it("rejects anything over 2 MB", () => {
    expect(parseDataUrl(`data:image/jpeg;base64,${"A".repeat(3 * 1024 * 1024)}`)).toMatch(/2 MB/);
  });
});

describe("toReport", () => {
  it("turns malformed output into 'not seen' rather than a confident guess", () => {
    expect(toReport({ seen: true, name: "", confidence: 0.99 })).toMatchObject({ seen: false, confidence: 0 });
    expect(toReport("nonsense")).toMatchObject({ seen: false, wrapper: "unknown" });
  });
  it("drops allergens with no certainty and clamps confidence", () => {
    const r = toReport({ seen: true, name: "Twix", allergens: [{ name: "milk", certainty: "listed" }, { name: "soy" }], wrapper: "sealed", confidence: 7 });
    expect(r.allergens).toEqual([{ name: "milk", certainty: "listed" }]);
    expect(r.confidence).toBe(1);
  });
});

describe("/api/identify", () => {
  it("forces the report_treat tool and returns the checked report", async () => {
    const model = fakeModel({ seen: true, name: "Snickers", brand: "Mars", kind: "chocolate bar", allergens: [{ name: "peanuts", certainty: "listed" }], wrapper: "sealed", confidence: 0.93 });
    const app = createApp({ apiKey: "k", fetch: model.fetch });
    const res = await app(post({ image: PNG }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ seen: true, name: "Snickers", wrapper: "sealed" });
    expect(model.sent[0].tool_choice).toEqual({ type: "tool", name: "report_treat" });
    expect(model.sent[0].messages[0].content[0].source.media_type).toBe("image/png");
  });
  it("says 503 without a key, so the client falls back to barcodes", async () => {
    const res = await createApp({})(post({ image: PNG }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("no-key");
  });
  it("refuses a bad image before calling the model", async () => {
    const model = fakeModel({});
    const res = await createApp({ apiKey: "k", fetch: model.fetch })(post({ image: "data:text/html;base64,PHA+" }));
    expect(res.status).toBe(400);
    expect(model.sent.length).toBe(0);
  });
  it("rate-limits one client", async () => {
    const model = fakeModel({ seen: false, name: "", kind: "", allergens: [], wrapper: "unknown", confidence: 0 });
    const app = createApp({ apiKey: "k", fetch: model.fetch, perMinute: 2, now: () => 1000 });
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await app(post({ image: PNG }), "1.2.3.4")).status);
    expect(codes).toEqual([200, 200, 429, 429]);
    expect((await app(post({ image: PNG }), "5.6.7.8")).status).toBe(200);
  });
  it("answers 502 when the model fails, without leaking details", async () => {
    const model = fakeModel({}, 500);
    const res = await createApp({ apiKey: "k", fetch: model.fetch })(post({ image: PNG }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("500");
  });
  it("only accepts POST", async () => {
    expect((await createApp({ apiKey: "k" })(new Request("http://x/api/identify"))).status).toBe(405);
  });
});

describe("/api/health", () => {
  it("says whether wrapper reading is on", async () => {
    expect(await (await createApp({})(new Request("http://x/api/health"))).json()).toMatchObject({ vision: false });
    expect(await (await createApp({ apiKey: "k" })(new Request("http://x/api/health"))).json()).toMatchObject({ vision: true });
  });
});

describe("fal provider", () => {
  it("sends the schema in the prompt and parses a fenced JSON answer", async () => {
    const sent: any[] = [];
    const fetch = (async (url: string, init: RequestInit) => {
      sent.push({ url, body: JSON.parse(String(init.body)), auth: (init.headers as Record<string, string>).authorization });
      const output = '```json\n{"seen":true,"name":"Twix","kind":"cookie bar","allergens":[{"name":"wheat","certainty":"listed"}],"wrapper":"torn","confidence":0.8}\n```';
      return new Response(JSON.stringify({ output, error: null }));
    }) as unknown as typeof globalThis.fetch;
    const res = await createApp({ provider: "fal", apiKey: "fk", fetch })(post({ image: PNG }));
    expect(await res.json()).toMatchObject({ seen: true, name: "Twix", wrapper: "torn" });
    expect(sent[0].url).toBe("https://fal.run/fal-ai/any-llm/vision");
    expect(sent[0].auth).toBe("Key fk");
    expect(sent[0].body.model).toBe("anthropic/claude-haiku-5.5");
    expect(sent[0].body.system_prompt).toContain('"wrapper"');
    expect(sent[0].body.image_urls[0]).toStartWith("data:image/png;base64,");
  });
  it("treats an answer with no JSON as an upstream failure", async () => {
    const fetch = (async () => new Response(JSON.stringify({ output: "I think it is candy.", error: null }))) as unknown as typeof globalThis.fetch;
    expect((await createApp({ provider: "fal", apiKey: "fk", fetch })(post({ image: PNG }))).status).toBe(502);
  });
});

describe("/api/speak", () => {
  const speakReq = (body: unknown) => new Request("http://x/api/speak", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
  function fakeVoice() {
    const sent: { url: string; body: any; key: string }[] = [];
    const fetch = (async (url: string, init: RequestInit) => {
      sent.push({ url, body: JSON.parse(String(init.body)), key: (init.headers as Record<string, string>)["xi-api-key"]! });
      return new Response(new Uint8Array([0xff, 0xf3, 1, 2, 3]), { headers: { "content-type": "audio/mpeg" } });
    }) as unknown as typeof globalThis.fetch;
    return { fetch, sent };
  }
  it("speaks with Serena by default and Ana when asked, and caches", async () => {
    const v = fakeVoice();
    const app = createApp({ speechKey: "el", fetch: v.fetch });
    const a = await app(speakReq({ text: "Snickers. Chocolate bar." }));
    expect(a.status).toBe(200);
    expect(a.headers.get("content-type")).toBe("audio/mpeg");
    expect(v.sent[0]!.url).toContain("/text-to-speech/oxbYD1TO2CqZp6MJoeD0");
    expect(v.sent[0]!.key).toBe("el");
    const again = await app(speakReq({ text: "Snickers.  Chocolate bar." }));
    expect(again.headers.get("x-cache")).toBe("hit");
    expect(v.sent.length).toBe(1);
    await app(speakReq({ text: "Snickers. Chocolate bar.", voice: "ana" }));
    expect(v.sent[1]!.url).toContain("/text-to-speech/Z0QKopwR1e0SJMnL0DU0");
  });
  it("falls back to Serena for a voice it doesn't know (older settings said George or Lily)", async () => {
    const v = fakeVoice();
    const app = createApp({ speechKey: "el", fetch: v.fetch });
    await app(speakReq({ text: "Twix.", voice: "spirit" }));
    expect(v.sent[0]!.url).toContain("/text-to-speech/oxbYD1TO2CqZp6MJoeD0");
  });
  it("refuses empty or very long text before calling the voice service", async () => {
    const v = fakeVoice();
    const app = createApp({ speechKey: "el", fetch: v.fetch });
    expect((await app(speakReq({ text: "  " }))).status).toBe(400);
    expect((await app(speakReq({ text: "x".repeat(901) }))).status).toBe(400);
    expect(v.sent.length).toBe(0);
  });
  it("says 503 without a key, so the browser voice takes over", async () => {
    expect((await createApp({})(speakReq({ text: "hi" }))).status).toBe(503);
    expect(await (await createApp({ speechKey: "el" })(new Request("http://x/api/health"))).json()).toMatchObject({ speech: true });
  });
});

describe("what counts as a treat", () => {
  it("asks the model to accept better-for-you treats, not only candy", () => {
    for (const t of ["fig bars", "Nature's Bakery", "granola", "fruit snacks", "pretzels", "raisins"]) expect(SYSTEM).toContain(t);
    expect(SYSTEM).not.toMatch(/no candy or sweet/i);
    expect(TOOL.input_schema.properties.seen.description).toMatch(/food treat/);
  });
});

// ---------------------------------------------------------------------------
// Cross-origin request rejection
// ---------------------------------------------------------------------------

/** Minimal POST to /api/identify with given headers. */
function identifyReq(extraHeaders: Record<string, string> = {}) {
  return new Request("http://127.0.0.1:8787/api/identify", {
    method: "POST",
    body: JSON.stringify({ image: PNG }),
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

/** Minimal POST to /api/speak with given headers. */
function speakReq2(extraHeaders: Record<string, string> = {}) {
  return new Request("http://127.0.0.1:8787/api/speak", {
    method: "POST",
    body: JSON.stringify({ text: "hi" }),
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

describe("cross-origin check on /api/identify", () => {
  // serverOrigin derived from Host header → "http://127.0.0.1:8787"
  const app = createApp({ apiKey: "k", serverOrigin: "http://127.0.0.1:8787", fetch: (async () => new Response(JSON.stringify({ content: [{ type: "tool_use", name: "report_treat", input: { seen: false, name: "", kind: "", allergens: [], wrapper: "unknown", confidence: 0 } }] }))) as unknown as typeof globalThis.fetch });

  it("allows requests with no Origin header", async () => {
    const res = await app(identifyReq());
    expect(res.status).not.toBe(403);
  });

  it("allows a matching same-site Origin", async () => {
    const res = await app(identifyReq({ origin: "http://127.0.0.1:8787" }));
    expect(res.status).not.toBe(403);
  });

  it("rejects a cross-site Origin with 403", async () => {
    const res = await app(identifyReq({ origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("cross-site");
  });

  it("rejects Sec-Fetch-Site: cross-site with 403", async () => {
    const res = await app(identifyReq({ "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("cross-site");
  });

  it("allows Sec-Fetch-Site: same-origin regardless of Origin", async () => {
    const res = await app(identifyReq({ "sec-fetch-site": "same-origin", origin: "http://127.0.0.1:8787" }));
    expect(res.status).not.toBe(403);
  });
});

describe("cross-origin check on /api/speak", () => {
  const app = createApp({ speechKey: "sk", serverOrigin: "http://127.0.0.1:8787", fetch: (async () => new Response(new Uint8Array([0xff, 0xf3]), { headers: { "content-type": "audio/mpeg" } })) as unknown as typeof globalThis.fetch });

  it("allows requests with no Origin header", async () => {
    const res = await app(speakReq2());
    expect(res.status).not.toBe(403);
  });

  it("rejects a cross-site Origin with 403", async () => {
    const res = await app(speakReq2({ origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("cross-site");
  });

  it("rejects Sec-Fetch-Site: cross-site with 403", async () => {
    const res = await app(speakReq2({ "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
  });
});

describe("global rate cap on /api/identify", () => {
  // Use a moving clock so this test's window doesn't collide with any earlier test's window.
  let t = Date.now() + 999_999_000;
  const now = () => t;
  const fakeIdentify = (async () =>
    new Response(JSON.stringify({ content: [{ type: "tool_use", name: "report_treat", input: { seen: false, name: "", kind: "", allergens: [], wrapper: "unknown", confidence: 0 } }] }))
  ) as unknown as typeof globalThis.fetch;

  it("allows requests up to the cap and returns 429 when exceeded", async () => {
    // Fresh minute window for this test.
    t = Date.now() + 999_999_000;
    const app = createApp({ apiKey: "k", fetch: fakeIdentify, globalPerMinute: 2, perMinute: 100, now });
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) codes.push((await app(identifyReq(), `client-${i}`)).status);
    // First 2 succeed (or hit upstream errors — we only care they are not 429 for the first two),
    // 3rd and 4th must be 429 from the global cap.
    expect(codes[0]).not.toBe(429);
    expect(codes[1]).not.toBe(429);
    expect(codes[2]).toBe(429);
    expect(codes[3]).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// crossOriginCheck: exact-match and host-fallback behaviour
// ---------------------------------------------------------------------------

describe("crossOriginCheck: lookalike origin rejected", () => {
  // No serverOrigin configured → falls back to comparing Origin host with Host header.
  // Host is "x.test"; Origin host is "x.test.evil.net" → must be rejected.
  it("rejects https://x.test.evil.net when Host is x.test", async () => {
    const app = createApp({ apiKey: "k", fetch: (async () => new Response(JSON.stringify({ content: [{ type: "tool_use", name: "report_treat", input: { seen: false, name: "", kind: "", allergens: [], wrapper: "unknown", confidence: 0 } }] }))) as unknown as typeof globalThis.fetch });
    const req = new Request("http://x.test/api/identify", {
      method: "POST",
      body: JSON.stringify({ image: PNG }),
      headers: { "content-type": "application/json", "host": "x.test", "origin": "https://x.test.evil.net" },
    });
    const res = await app(req);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("cross-site");
  });
});

describe("crossOriginCheck: Origin matching Host allowed", () => {
  // No serverOrigin → host-fallback: Origin host matches Host header → allowed.
  it("allows https Origin whose host matches the Host header", async () => {
    const app = createApp({ apiKey: "k", fetch: (async () => new Response(JSON.stringify({ content: [{ type: "tool_use", name: "report_treat", input: { seen: false, name: "", kind: "", allergens: [], wrapper: "unknown", confidence: 0 } }] }))) as unknown as typeof globalThis.fetch });
    const req = new Request("https://x.test/api/identify", {
      method: "POST",
      body: JSON.stringify({ image: PNG }),
      headers: { "content-type": "application/json", "host": "x.test", "origin": "https://x.test" },
    });
    const res = await app(req);
    expect(res.status).not.toBe(403);
  });
});

describe("crossOriginCheck: Origin null rejected", () => {
  it("rejects the literal Origin header value 'null'", async () => {
    const app = createApp({ apiKey: "k", fetch: (async () => new Response(JSON.stringify({ content: [{ type: "tool_use", name: "report_treat", input: { seen: false, name: "", kind: "", allergens: [], wrapper: "unknown", confidence: 0 } }] }))) as unknown as typeof globalThis.fetch });
    const req = new Request("http://x.test/api/identify", {
      method: "POST",
      body: JSON.stringify({ image: PNG }),
      headers: { "content-type": "application/json", "host": "x.test", "origin": "null" },
    });
    const res = await app(req);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("cross-site");
  });
});

describe("crossOriginCheck: Electron app:// origin", () => {
  // serverOrigin: "app://trick-or-read" — same as the Electron createApp call.
  const electronApp = createApp({
    apiKey: "k",
    serverOrigin: "app://trick-or-read",
    fetch: (async () => new Response(JSON.stringify({ content: [{ type: "tool_use", name: "report_treat", input: { seen: false, name: "", kind: "", allergens: [], wrapper: "unknown", confidence: 0 } }] }))) as unknown as typeof globalThis.fetch,
  });

  it("allows Origin: app://trick-or-read", async () => {
    const req = new Request("app://trick-or-read/api/identify", {
      method: "POST",
      body: JSON.stringify({ image: PNG }),
      headers: { "content-type": "application/json", "origin": "app://trick-or-read" },
    });
    const res = await electronApp(req);
    expect(res.status).not.toBe(403);
  });

  it("rejects any other origin when serverOrigin is app://trick-or-read", async () => {
    const req = new Request("app://trick-or-read/api/identify", {
      method: "POST",
      body: JSON.stringify({ image: PNG }),
      headers: { "content-type": "application/json", "origin": "https://evil.example" },
    });
    const res = await electronApp(req);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("cross-site");
  });
});

describe("global cap: two createApp instances do not share state", () => {
  const fakeIdentify = (async () =>
    new Response(JSON.stringify({ content: [{ type: "tool_use", name: "report_treat", input: { seen: false, name: "", kind: "", allergens: [], wrapper: "unknown", confidence: 0 } }] }))
  ) as unknown as typeof globalThis.fetch;

  it("each instance has its own global cap counter", async () => {
    let t = Date.now() + 888_888_000;
    const now = () => t;
    // Two apps, each capped at 1 request per minute globally.
    const appA = createApp({ apiKey: "k", fetch: fakeIdentify, globalPerMinute: 1, perMinute: 100, now });
    const appB = createApp({ apiKey: "k", fetch: fakeIdentify, globalPerMinute: 1, perMinute: 100, now });

    // First request to A succeeds; second to A is capped.
    expect((await appA(identifyReq(), "c1")).status).not.toBe(429);
    expect((await appA(identifyReq(), "c2")).status).toBe(429);

    // B has its own counter — its first request must succeed even though A is capped.
    expect((await appB(identifyReq(), "c3")).status).not.toBe(429);
    expect((await appB(identifyReq(), "c4")).status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// CSP header on static HTML
// ---------------------------------------------------------------------------

describe("CSP header", () => {
  it("is present on the static index.html response and contains required directives", async () => {
    // createApp with a staticDir that resolves to a real file. Use the tests/ dir itself:
    // any path that doesn't match a real file falls back to index.html — but we need index.html
    // to actually exist in staticDir. Use import.meta.dir which contains these test files.
    // We'll stub staticDir as "." and rely on the fallback: since "/" won't match a real file
    // it falls back to index.html. But index.html doesn't exist in ".". The static handler
    // returns whatever Bun.file resolves — it will return a 404-ish response or the file.
    // Instead, test via a known staticDir with index.html: dist/ if built, otherwise skip.
    // Per the task spec, the simplest approach: create a minimal index.html in a temp dir.
    const tmpDir = `/tmp/tor-csp-test-${Date.now()}`;
    await Bun.write(`${tmpDir}/index.html`, "<!doctype html><html></html>");
    const app = createApp({ staticDir: tmpDir });
    const res = await app(new Request("http://x/"));
    const csp = res.headers.get("content-security-policy");
    expect(csp).not.toBeNull();
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("https://world.openfoodfacts.org");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'self'");
  });

  it("is absent on JSON API responses", async () => {
    const res = await createApp({})(new Request("http://x/api/health"));
    expect(res.headers.get("content-security-policy")).toBeNull();
  });
});
