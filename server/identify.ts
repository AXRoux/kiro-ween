/**
 * The vision read (Requirement 3.2): one frame to Anthropic's Messages API with a forced tool call, so the model can
 * only answer in the report_candy shape. Everything it returns is checked again here before the browser sees it.
 */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MODEL = "claude-sonnet-5-5";

const WRAPPERS = ["sealed", "opened", "torn", "unwrapped", "unknown"] as const;
export type WireWrapper = (typeof WRAPPERS)[number];

export interface CandyReport {
  seen: boolean;
  name: string;
  brand: string;
  kind: string;
  flavor: string;
  size: string;
  allergens: { name: string; certainty: "listed" | "likely" }[];
  wrapper: WireWrapper;
  confidence: number;
  guidance: string;
}

export const SYSTEM = `You are the eyes of a talking mirror used by blind and low-vision people to identify Halloween candy held up to a webcam. Your answer is read aloud, and someone may decide whether to eat the candy based on it.

Rules:
- Identify the candy the person is holding, not things in the background. If no candy or sweet is clearly visible, set seen to false and give one short, practical instruction in guidance (for example "Hold it closer, the front of the wrapper facing the camera" or "Turn it over, I can see the back").
- name is the product name as a person would say it ("Snickers", "Reese's Peanut Butter Cups", "Skittles Original"). Never invent a brand you cannot read or clearly recognise; when unsure, describe it plainly ("a small orange-wrapped hard candy") and lower confidence.
- allergens: list peanuts, tree nuts, milk, egg, soy, wheat, sesame, coconut that apply. certainty "listed" only when you can read it printed on this wrapper; "likely" when it is what this product normally contains. Leave out anything you are unsure of rather than guessing.
- wrapper: "sealed" only when the packaging looks intact. "opened" or "torn" if there is any visible opening, tear, puncture or re-sealed look. "unwrapped" for a bare candy. "unknown" if you cannot tell. This matters for safety: say what you see.
- size: "fun size", "full size", "snack size", "king size" or "" if unclear. kind: what it is ("chocolate bar", "gummy candy", "lollipop").
- confidence: 0 to 1, how sure you are of the name.`;

export const TOOL = {
  name: "report_candy",
  description: "Report what candy is being held up to the camera.",
  input_schema: {
    type: "object",
    properties: {
      seen: { type: "boolean", description: "A candy or sweet is clearly visible and held up." },
      name: { type: "string" },
      brand: { type: "string" },
      kind: { type: "string" },
      flavor: { type: "string" },
      size: { type: "string" },
      allergens: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", enum: ["peanuts", "tree nuts", "milk", "egg", "soy", "wheat", "sesame", "coconut"] },
            certainty: { type: "string", enum: ["listed", "likely"] },
          },
          required: ["name", "certainty"],
        },
      },
      wrapper: { type: "string", enum: [...WRAPPERS] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      guidance: { type: "string", description: "When seen is false: one short instruction to the person." },
    },
    required: ["seen", "name", "kind", "allergens", "wrapper", "confidence"],
  },
} as const;

/** "data:image/jpeg;base64,..." to its parts, or an error message. */
export function parseDataUrl(url: unknown): { mediaType: "image/jpeg" | "image/png"; data: string } | string {
  if (typeof url !== "string") return "image must be a data URL string";
  const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!m) return "image must be a base64 JPEG or PNG data URL";
  const bytes = Math.floor((m[2]!.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) return "image is larger than 2 MB";
  return { mediaType: m[1] as "image/jpeg" | "image/png", data: m[2]! };
}

const str = (v: unknown, max = 120): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Checks and normalises the tool input. Anything malformed becomes "not seen" rather than a confident wrong answer. */
export function toReport(input: unknown): CandyReport {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const allergens = Array.isArray(o.allergens)
    ? o.allergens.flatMap((a) => {
        const x = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
        const name = str(x.name, 30).toLowerCase();
        const certainty = x.certainty === "listed" ? "listed" : x.certainty === "likely" ? "likely" : null;
        return name && certainty ? [{ name, certainty } as const] : [];
      })
    : [];
  const confidence = typeof o.confidence === "number" && Number.isFinite(o.confidence) ? Math.min(1, Math.max(0, o.confidence)) : 0;
  const seen = o.seen === true && str(o.name).length > 0;
  return {
    seen,
    name: seen ? str(o.name) : "",
    brand: str(o.brand),
    kind: str(o.kind),
    flavor: str(o.flavor),
    size: str(o.size, 30),
    allergens,
    wrapper: (WRAPPERS as readonly string[]).includes(o.wrapper as string) ? (o.wrapper as WireWrapper) : "unknown",
    confidence: seen ? confidence : 0,
    guidance: str(o.guidance, 200),
  };
}

export type Provider = "fal" | "anthropic";
export const DEFAULT_MODELS: Record<Provider, string> = { fal: "anthropic/claude-haiku-5.5", anthropic: DEFAULT_MODEL };

export interface IdentifyDeps {
  provider: Provider;
  apiKey: string;
  model: string;
  fetch: typeof fetch;
}

/** The first JSON object in a model's text answer (tolerates a code fence or a stray sentence around it). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Calls the vision model and returns the checked report. Throws with a short message on an upstream failure. */
export async function identify(image: { mediaType: string; data: string }, deps: IdentifyDeps): Promise<CandyReport> {
  return deps.provider === "fal" ? identifyFal(image, deps) : identifyAnthropic(image, deps);
}

/** Anthropic's Messages API, with a forced tool call: the model can only answer in the report_candy shape. */
async function identifyAnthropic(image: { mediaType: string; data: string }, deps: IdentifyDeps): Promise<CandyReport> {
  const res = await deps.fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": deps.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: deps.model,
      max_tokens: 600,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
            { type: "text", text: "What candy am I holding up? Report it with report_candy." },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`vision model answered ${res.status}`);
  const body = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[] };
  const call = body.content?.find((c) => c.type === "tool_use" && c.name === TOOL.name);
  if (!call) throw new Error("vision model gave no report");
  return toReport(call.input);
}

/** fal.ai's any-llm vision endpoint: same system prompt, the schema stated in the prompt, JSON parsed and re-checked. */
async function identifyFal(image: { mediaType: string; data: string }, deps: IdentifyDeps): Promise<CandyReport> {
  const res = await deps.fetch("https://fal.run/fal-ai/any-llm/vision", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Key ${deps.apiKey}` },
    body: JSON.stringify({
      model: deps.model,
      system_prompt: `${SYSTEM}\n\nAnswer with only one JSON object that matches this JSON schema. No prose, no code fence.\n${JSON.stringify(TOOL.input_schema)}`,
      prompt: "What candy am I holding up?",
      image_urls: [`data:${image.mediaType};base64,${image.data}`],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`vision model answered ${res.status}`);
  const body = (await res.json()) as { output?: string; error?: string | null };
  if (body.error || typeof body.output !== "string") throw new Error("vision model gave no report");
  const parsed = extractJson(body.output);
  if (!parsed) throw new Error("vision model gave no JSON");
  return toReport(parsed);
}
