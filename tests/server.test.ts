import { describe, expect, it } from "bun:test";
import { createApp } from "../server/app";
import { parseDataUrl, toReport } from "../server/identify";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const post = (body: unknown) => new Request("http://x/api/identify", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

/** A fake Anthropic that answers with the given tool input and records what it was sent. */
function fakeModel(input: unknown, status = 200) {
  const sent: any[] = [];
  const fetch = (async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ content: [{ type: "tool_use", name: "report_candy", input }] }), { status });
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
  it("forces the report_candy tool and returns the checked report", async () => {
    const model = fakeModel({ seen: true, name: "Snickers", brand: "Mars", kind: "chocolate bar", allergens: [{ name: "peanuts", certainty: "listed" }], wrapper: "sealed", confidence: 0.93 });
    const app = createApp({ apiKey: "k", fetch: model.fetch });
    const res = await app(post({ image: PNG }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ seen: true, name: "Snickers", wrapper: "sealed" });
    expect(model.sent[0].tool_choice).toEqual({ type: "tool", name: "report_candy" });
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
  it("speaks with George by default and Lily for the spirit voice, and caches", async () => {
    const v = fakeVoice();
    const app = createApp({ speechKey: "el", fetch: v.fetch });
    const a = await app(speakReq({ text: "Snickers. Chocolate bar." }));
    expect(a.status).toBe(200);
    expect(a.headers.get("content-type")).toBe("audio/mpeg");
    expect(v.sent[0]!.url).toContain("/text-to-speech/JBFqnCBsd6RMkjVDRZzb");
    expect(v.sent[0]!.key).toBe("el");
    const again = await app(speakReq({ text: "Snickers.  Chocolate bar." }));
    expect(again.headers.get("x-cache")).toBe("hit");
    expect(v.sent.length).toBe(1);
    await app(speakReq({ text: "Snickers. Chocolate bar.", voice: "spirit" }));
    expect(v.sent[1]!.url).toContain("/text-to-speech/pFZP5JQG7iQjIQuC4Bku");
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
