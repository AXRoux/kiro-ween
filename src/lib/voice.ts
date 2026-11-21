/**
 * The mirror's voice. Natural speech from ElevenLabs through our server (/api/speak): George, a warm storyteller
 * (the default, the clearest), or Lily, a velvety medium. If the server has no voice key, or the request fails, the
 * browser's own speech takes over so the user is never left in silence.
 * A new sentence always replaces the one being spoken: a fresh result matters more than the end of an old one.
 */
export type VoiceStyle = "clear" | "spirit";

type Listener = (speaking: boolean) => void;
const listeners = new Set<Listener>();
let style: VoiceStyle = (localStorage.getItem("tor.voice") as VoiceStyle | null) ?? "clear";
let rate = Number(localStorage.getItem("tor.rate") ?? "1") || 1;
/** null until /api/health answers; then whether the server can speak. */
let serverVoice: boolean | null = null;

const audio = typeof Audio !== "undefined" ? new Audio() : null;
if (audio) audio.preload = "auto";
const clips = new Map<string, string>(); // text+voice → object URL, kept for the session
let current: { cancel: () => void } | null = null;
const emit = (s: boolean) => listeners.forEach((l) => l(s));

const browserSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window;
let browserVoice: SpeechSynthesisVoice | null = null;
function pickBrowserVoice(): SpeechSynthesisVoice | null {
  if (!browserSpeech()) return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const rank = (v: SpeechSynthesisVoice) => (/natural|neural|enhanced|premium/i.test(v.name) ? 4 : 0) + (/samantha|daniel|google uk english|aria|jenny/i.test(v.name) ? 2 : 0) + (v.default ? 1 : 0);
  return voices.sort((a, b) => rank(b) - rank(a))[0] ?? null;
}
if (browserSpeech()) {
  browserVoice = pickBrowserVoice();
  speechSynthesis.addEventListener?.("voiceschanged", () => (browserVoice = pickBrowserVoice()));
}

async function clip(text: string, signal: AbortSignal): Promise<string> {
  const key = `${style}\u0000${text}`;
  const hit = clips.get(key);
  if (hit) return hit;
  const res = await fetch("/api/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, voice: style }), signal });
  if (res.status === 503) serverVoice = false;
  if (!res.ok) throw new Error(`speak ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  clips.set(key, url);
  return url;
}

function playServer(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!audio) return reject(new Error("no audio"));
    const abort = new AbortController();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      audio.onended = audio.onerror = audio.onplaying = null;
      emit(false);
      if (ok) resolve();
      else reject(new Error("playback"));
    };
    current = {
      cancel: () => {
        abort.abort();
        audio.pause();
        finish(true);
      },
    };
    clip(text, abort.signal)
      .then((url) => {
        if (done) return;
        audio.src = url;
        audio.playbackRate = rate;
        (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
        audio.onplaying = () => emit(true);
        audio.onended = () => finish(true);
        audio.onerror = () => finish(false);
        return audio.play();
      })
      .catch(() => finish(false));
  });
}

function playBrowser(text: string): Promise<void> {
  if (!browserSpeech()) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (browserVoice) u.voice = browserVoice;
    u.lang = browserVoice?.lang ?? "en-US";
    u.rate = style === "spirit" ? rate * 0.9 : rate;
    u.pitch = style === "spirit" ? 0.75 : 1;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(fallback);
      emit(false);
      resolve();
    };
    // Some browsers never fire onend for long sentences: never leave the mirror waiting.
    const fallback = setTimeout(done, 2500 + (text.length * 85) / u.rate);
    current = { cancel: () => (speechSynthesis.cancel(), done()) };
    u.onstart = () => emit(true);
    u.onend = u.onerror = done;
    speechSynthesis.speak(u);
  });
}

export const voice = {
  supported: () => Boolean(audio) || browserSpeech(),
  get style() {
    return style;
  },
  setStyle(s: VoiceStyle) {
    style = s;
    localStorage.setItem("tor.voice", s);
  },
  get rate() {
    return rate;
  },
  setRate(r: number) {
    rate = Math.min(1.6, Math.max(0.6, r));
    localStorage.setItem("tor.rate", String(rate));
    if (audio) audio.playbackRate = rate;
  },
  /** Tell the voice whether the server can speak (from /api/health). */
  setServerVoice(on: boolean) {
    serverVoice = on;
  },
  onSpeaking(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  async say(text: string): Promise<void> {
    if (!text) return;
    current?.cancel();
    if (serverVoice !== false && audio) {
      try {
        return await playServer(text);
      } catch {
        /* fall through to the browser's voice */
      }
    }
    return playBrowser(text);
  },
  /** Warms the cache for sentences the user is likely to hear next (the greeting, help). */
  prefetch(texts: string[]) {
    if (serverVoice !== true) return;
    for (const t of texts) void clip(t, new AbortController().signal).catch(() => undefined);
  },
  hush() {
    current?.cancel();
    if (browserSpeech()) speechSynthesis.cancel();
    emit(false);
  },
  /** Runs inside the user's first click: browsers only allow sound after a gesture. */
  unlock() {
    if (audio) {
      audio.src = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
      audio.volume = 0;
      void audio.play().catch(() => undefined).finally(() => {
        audio.pause();
        audio.volume = 1;
      });
    }
    if (browserSpeech()) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  },
};
