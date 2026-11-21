/**
 * The spirit's voice: ElevenLabs text to speech, on the server so the key never reaches a browser.
 * Two voices: George (a warm storyteller, the clearest, the default) and Lily (a velvety medium).
 * Answers are cached in memory, so the greeting, help and repeated candies play instantly.
 */
export const VOICES = {
  clear: { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", stability: 0.55, style: 0.25 },
  spirit: { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", stability: 0.38, style: 0.55 },
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
  const voice = o.voice === "spirit" ? "spirit" : "clear";
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
