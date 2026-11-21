/**
 * Voice commands (Requirement 2.2, 4.4, 4.5, 7.2) where the browser supports speech recognition (Chrome, Edge, Safari).
 * Pauses while the mirror is speaking so it never hears itself.
 */
export type Command = "scan" | "repeat" | "more" | "haul" | "help" | "hush" | "settings";

const WORDS: [RegExp, Command][] = [
  [/\b(scan|read( it| this)?|what is (it|this)|check)\b/, "scan"],
  [/\b(repeat|again|say that again|pardon)\b/, "repeat"],
  [/\b(more|details|ingredients|tell me more)\b/, "more"],
  [/\b(haul|bag|my candy|what do i have)\b/, "haul"],
  [/\b(help|commands)\b/, "help"],
  [/\b(stop|quiet|hush|shh)\b/, "hush"],
  [/\b(settings|allergies|allergens)\b/, "settings"],
];

export const commandFrom = (said: string): Command | null => WORDS.find(([re]) => re.test(said.toLowerCase()))?.[1] ?? null;

type Rec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function listenSupported(): boolean {
  return Boolean((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}

export function startListening(onCommand: (c: Command) => void): { pause(): void; resume(): void; stop(): void } {
  const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  if (!Ctor) return { pause() {}, resume() {}, stop() {} };
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = false;
  rec.lang = "en-US";
  let wanted = true;
  let paused = false;
  let running = false;
  const start = () => {
    if (running || !wanted || paused) return;
    try {
      rec.start();
      running = true;
    } catch {
      /* already started */
    }
  };
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]!;
      if (!r.isFinal) continue;
      const c = commandFrom(r[0]?.transcript ?? "");
      if (c) onCommand(c);
    }
  };
  rec.onend = () => {
    running = false;
    setTimeout(start, 250);
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") wanted = false;
  };
  start();
  return {
    pause() {
      paused = true;
      if (running) rec.stop();
    },
    resume() {
      paused = false;
      start();
    },
    stop() {
      wanted = false;
      rec.stop();
    },
  };
}
