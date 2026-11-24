/**
 * The castle's voice: ElevenLabs text to speech, on the server so the key never reaches a browser.
 * Two young Brazilian women from the ElevenLabs voice library, both speaking English:
 * - Serena (the default): warm, relaxed and a little playful, with a Brazilian accent.
 * - Ana: calm, even and very clear, for anyone who wants every word measured out.
 * Stability is kept high enough that allergen names never get swallowed by expressiveness.
 * Answers are cached in memory, so the greeting, help and repeated candies play instantly.
 */
export const VOICES = {
  serena: { id: "oxbYD1TO2CqZp6MJoeD0", name: "Serena", stability: 0.5, style: 0.3 },
  ana: { id: "Z0QKopwR1e0SJMnL0DU0", name: "Ana", stability: 0.6, style: 0.15 },
} as const;
export type VoiceKey = keyof typeof VOICES;
export const SPEECH_MODEL = "eleven_flash_v2_5";
export const MAX_TEXT = 900;

export interface SpeakDeps {
  apiKey: string;
  fetch: typeof fetch;
  model?: string;
}

export function checkSpeech(body: unknown): { text: string; voice: VoiceKey } | string {
  const o = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.replace(/\s+/g, " ").trim() : "";
  if (!text) return "text is required";
  if (text.length > MAX_TEXT) return `text is longer than ${MAX_TEXT} characters`;
  const voice = o.voice === "ana" ? "ana" : "serena";
  return { text, voice };
}

export function createSpeaker(deps: SpeakDeps, cacheSize = 300) {
  const cache = new Map<string, Uint8Array>();
  return async function speak(text: string, voice: VoiceKey): Promise<{ audio: Uint8Array; cached: boolean }> {
    const key = `${voice}\u0000${text}`;
    const hit = cache.get(key);
    if (hit) {
      cache.delete(key);
      cache.set(key, hit); // most recently used last
      return { audio: hit, cached: true };
    }
    const v = VOICES[voice];
    const res = await deps.fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=mp3_44100_96`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "audio/mpeg", "xi-api-key": deps.apiKey },
      body: JSON.stringify({
        text,
        model_id: deps.model ?? SPEECH_MODEL,
        voice_settings: { stability: v.stability, similarity_boost: 0.8, style: v.style, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`voice service answered ${res.status}`);
    const audio = new Uint8Array(await res.arrayBuffer());
    cache.set(key, audio);
    if (cache.size > cacheSize) cache.delete(cache.keys().next().value!);
    return { audio, cached: false };
  };
}
