import { useCallback, useEffect, useRef, useState } from "react";
import { Atmosphere } from "./components/Atmosphere";
import { Gate } from "./components/Gate";
import { Mirror, type Stage } from "./components/Mirror";
import { SpiritBoard } from "./components/SpiritBoard";
import { Haul } from "./components/Haul";
import { Settings, type Prefs } from "./components/Settings";
import { allergenLabel } from "./lib/allergens";
import { readBarcode } from "./lib/barcode";
import { CameraError, captureJpeg, FrameSampler, openCamera } from "./lib/camera";
import { addToHaul, type HaulItem } from "./lib/haul";
import { identifyFrame } from "./lib/identify";
import { listenSupported, startListening, type Command } from "./lib/listen";
import { Stillness, toLuma } from "./lib/motion";
import { lookupBarcode } from "./lib/openfoodfacts";
import { details, GREETING, guidance, haulSummary, HELP, NO_KEY, summary, TOO_DARK } from "./lib/phrasing";
import { merge } from "./lib/reading";
import { sounds } from "./lib/sounds";
import { emptyReading, type Judgement, type Reading } from "./lib/types";
import { judge } from "./lib/verdict";
import { voice } from "./lib/voice";
import "./styles/app.css";

const DEFAULT_PREFS: Prefs = { allergens: [], output: "voice", voiceStyle: "clear", rate: 1, autoScan: true, sounds: true, listening: false };
const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};
const CAMERA_PROBLEM: Record<CameraError["reason"], string> = {
  denied: "The mirror needs your camera. Allow camera access for this page in your browser's settings, then press Enter the séance again.",
  missing: "I can't find a camera. Plug one in, or open this page on a phone, then press Enter the séance again.",
  unsupported: "This browser can't share a camera with web pages. Try Chrome, Edge, Safari or Firefox.",
  failed: "The camera would not start. Close other apps that might be using it, then press Enter the séance again.",
};

/**
 * The séance. A small state machine: watching → sensing → still → scrying → speaking → watching (plus dark).
 * Everything the screen shows is also said, either by the spirit's voice or through the live region for the user's
 * own screen reader (never both, so nothing is heard twice).
 */
export function App() {
  const [entered, setEntered] = useState(false);
  const [gateBusy, setGateBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [stage, setStageState] = useState<Stage>("watching");
  const [progress, setProgress] = useState(0);
  const [reading, setReading] = useState<Reading | null>(null);
  const [judgement, setJudgement] = useState<Judgement | null>(null);
  const [haul, setHaul] = useState<HaulItem[]>(() => load<{ items: HaulItem[] }>("tor.haul", { items: [] }).items);
  const [prefs, setPrefsState] = useState<Prefs>(() => load("tor.prefs", DEFAULT_PREFS));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stillRef = useRef<Stillness | null>(null);
  const lumaRef = useRef<Float32Array | null>(null);
  const busyRef = useRef(false);
  const stageRef = useRef<Stage>("watching");
  const prefsRef = useRef(prefs);
  const visionRef = useRef<boolean | null>(null);
  const lastRef = useRef<{ reading: Reading; judgement: Judgement } | null>(null);
  const lastSaidRef = useRef("");
  const haulRef = useRef(haul);
  prefsRef.current = prefs;
  haulRef.current = haul;

  const setStage = (s: Stage) => {
    stageRef.current = s;
    setStageState(s);
  };

  const setPrefs = (p: Prefs) => {
    const before = prefsRef.current;
    setPrefsState(p);
    prefsRef.current = p;
    localStorage.setItem("tor.prefs", JSON.stringify(p));
    voice.setStyle(p.voiceStyle);
    voice.setRate(p.rate);
    sounds.setEnabled(p.sounds);
    // Speak back what changed (Requirement 6.2).
    if (p.allergens.join() !== before.allergens.join()) {
      say(p.allergens.length ? `I'll warn you about ${p.allergens.map((a) => allergenLabel(a).toLowerCase()).join(", ")}.` : "I won't warn about any allergens.");
    } else if (p.voiceStyle !== before.voiceStyle) say(p.voiceStyle === "spirit" ? "I'm Lily. I'll be your medium tonight." : "I'm George. I'll read your treats to you.");
    else if (p.output !== before.output) say(p.output === "voice" ? "I'll speak for myself." : "Your screen reader will speak for me.");
    else if (p.autoScan !== before.autoScan) say(p.autoScan ? "I'll read on my own when you hold a candy still." : "I'll wait for you to press space.");
  };

  useEffect(() => localStorage.setItem("tor.haul", JSON.stringify({ items: haul })), [haul]);
  useEffect(() => {
    const off = voice.onSpeaking(setSpeaking);
    return () => void off();
  }, []);
  useEffect(() => {
    voice.setStyle(prefs.voiceStyle);
    voice.setRate(prefs.rate);
    sounds.setEnabled(prefs.sounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Says something the right way for this user: the spirit's voice, or the live region for their screen reader. */
  const say = useCallback((text: string, urgent = false): Promise<void> => {
    lastSaidRef.current = text;
    if (prefsRef.current.output === "screenreader" || !voice.supported()) {
      // Clear first so the same sentence twice is still announced.
      const set = urgent ? setAssertive : setPolite;
      set("");
      setTimeout(() => set(text), 60);
      return Promise.resolve();
    }
    return voice.say(text);
  }, []);

  // ---------------------------------------------------------------- reading a candy
  const scan = useCallback(
    async (trigger: "auto" | "manual") => {
      if (busyRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        void say("The mirror can't see yet. Give it a moment.");
        return;
      }
      busyRef.current = true;
      setStage("scrying");
      setReading(null);
      setJudgement(null);
      if (trigger === "manual") sounds.heartbeat();
      if (lumaRef.current) stillRef.current?.markRead(lumaRef.current);
      try {
        const frame = captureJpeg(video);
        const code = await readBarcode(video);
        const [label, seen] = await Promise.all([code ? lookupBarcode(code) : Promise.resolve(null), visionRef.current === false ? Promise.resolve(null) : identifyFrame(frame)]);
        if (seen && !seen.ok && seen.reason === "no-key") visionRef.current = false;
        const result = merge(label, seen?.ok ? seen.reading : null);

        if (!result?.seen) {
          sounds.creak();
          setStage("watching");
          if (seen && !seen.ok && seen.reason === "slow-down") await say("Too many readings at once. Wait a moment, then try again.");
          else if (seen && !seen.ok && seen.reason === "failed") await say("The spirits did not answer. Hold it still and try again.");
          else if (visionRef.current === false) await say(code ? `I found barcode ${code.split("").join(" ")}, but no label for it. ${NO_KEY}` : NO_KEY);
          else await say(guidance(result ?? emptyReading("vision")));
          return;
        }

        const mine = prefsRef.current.allergens;
        const j = judge(result, mine);
        setReading(result);
        setJudgement(j);
        lastRef.current = { reading: result, judgement: j };
        setHaul((h) => addToHaul(h, result.name || "Something sweet", j.verdict));
        if (j.verdict === "beware") sounds.toll();
        else if (j.verdict === "safe") sounds.safe();
        else sounds.chime();
        setStage("speaking");
        await say(summary(result, j, mine), j.verdict === "beware");
      } finally {
        busyRef.current = false;
        if (stageRef.current === "speaking" || stageRef.current === "scrying") setStage("watching");
      }
    },
    [say],
  );

  // ---------------------------------------------------------------- commands (keys and voice share these)
  const run = useCallback(
    (c: Command | "voice" | "listen") => {
      const last = lastRef.current;
      switch (c) {
        case "scan":
          return void scan("manual");
        case "repeat":
          return void say(last ? summary(last.reading, last.judgement, prefsRef.current.allergens) : lastSaidRef.current || "Nothing to repeat yet.");
        case "more":
          return void say(last ? details(last.reading) : "Read a candy first, then ask for more.");
        case "haul":
          return void say(haulSummary(haulRef.current));
        case "help":
          return void say(HELP);
        case "hush":
          voice.hush();
          return;
        case "settings":
          setSettingsOpen(true);
          return;
        case "voice":
          return setPrefs({ ...prefsRef.current, voiceStyle: prefsRef.current.voiceStyle === "clear" ? "spirit" : "clear" });
        case "listen":
          if (!listenSupported()) return void say("Voice commands are not supported in this browser.");
          setPrefs({ ...prefsRef.current, listening: !prefsRef.current.listening });
          return void say(prefsRef.current.listening ? "I'm listening. Say scan, repeat, more, haul or help." : "I've stopped listening.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scan, say],
  );
  useEffect(() => {
    if (!entered) return;
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, dialog")) return;
      // Space and Enter on a focused button press that button; everywhere else Space reads.
      if ((e.key === " " || e.key === "Enter") && t.closest("button, a")) return;
      const map: Record<string, Command | "voice" | "listen"> = { " ": "scan", r: "repeat", m: "more", b: "haul", s: "settings", h: "help", "?": "help", v: "voice", l: "listen", Escape: "hush" };
      const c = map[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!c) return;
      e.preventDefault();
      run(c);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [entered, settingsOpen, run]);

  useEffect(() => {
    if (!entered || !prefs.listening) return;
    const ears = startListening((c) => run(c));
    const off = voice.onSpeaking((s) => (s ? ears.pause() : ears.resume()));
    return () => {
      void off();
      ears.stop();
    };
  }, [entered, prefs.listening, run]);

  // ---------------------------------------------------------------- the watch loop (10 frames a second, on 64 x 48 pixels)
  useEffect(() => {
    if (!entered) return;
    const sampler = new FrameSampler();
    const still = new Stillness();
    stillRef.current = still;
    let raf = 0;
    let last = 0;
    let darkSaid = 0;
    let wasSteadying = false;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 100) return;
      last = now;
      const video = videoRef.current;
      const pixels = video && sampler.sample(video);
      if (!pixels) return;
      const luma = toLuma(pixels);
      lumaRef.current = luma;
      if (busyRef.current) return;
      const tick = still.feed(luma, now);
      const next: Stage = tick.phase === "dark" ? "dark" : tick.phase === "moving" ? "sensing" : tick.phase === "steadying" ? "still" : "watching";
      if (!(stageRef.current === "speaking" && next === "watching") && next !== stageRef.current) setStage(next);
      setProgress(tick.progress);
      if (tick.phase === "steadying" && !wasSteadying) sounds.heartbeat();
      wasSteadying = tick.phase === "steadying";
      if (tick.phase === "dark" && now - darkSaid > 8000 && !voiceBusy()) {
        darkSaid = now;
        void say(TOO_DARK);
      }
      if (tick.fire && prefsRef.current.autoScan) void scan("auto");
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [entered, scan, say]);

  // ---------------------------------------------------------------- entering
  const enter = async () => {
    setGateBusy(true);
    setProblem(null);
    voice.unlock();
    sounds.unlock();
    try {
      const stream = await openCamera();
      streamRef.current = stream;
      sounds.whoosh();
      setEntered(true);
      const health = (await fetch("/api/health")
        .then((r) => r.json())
        .catch(() => null)) as { vision?: boolean; speech?: boolean } | null;
      visionRef.current = health ? Boolean(health.vision) : null;
      voice.setServerVoice(Boolean(health?.speech));
      voice.prefetch([HELP]);
      void say(visionRef.current === false ? `${GREETING} Wrapper reading is off on this server, so show me barcodes.` : GREETING);
    } catch (e) {
      const text = e instanceof CameraError ? CAMERA_PROBLEM[e.reason] : CAMERA_PROBLEM.failed;
      setProblem(text);
      void voice.say(text);
    } finally {
      setGateBusy(false);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!entered || !v || !streamRef.current) return;
    v.srcObject = streamRef.current;
    void v.play().catch(() => undefined);
  }, [entered]);

  const verdict = stage === "scrying" ? undefined : judgement?.verdict;

  return (
    <div className="app" data-verdict={verdict}>
      <Atmosphere />
      <div className="sr-only" aria-live="polite" role="status">
        {polite}
      </div>
      <div className="sr-only" aria-live="assertive" role="alert">
        {assertive}
      </div>

      {!entered ? (
        <Gate onEnter={enter} problem={problem} busy={gateBusy} />
      ) : (
        <>
          <header className="app__head">
            <h1 className="app__title">
              Trick <span>or</span> Read
            </h1>
            <p className="app__status" aria-hidden="true">
              <span className="app__status-dot" />
              {stageLine(stage, prefs.autoScan)}
            </p>
            <div className="app__tools">
              <button type="button" className="brass" onClick={() => run("scan")}>
                Read now <kbd>Space</kbd>
              </button>
              <button type="button" className="brass" onClick={() => setSettingsOpen(true)}>
                Grimoire <kbd>S</kbd>
              </button>
            </div>
          </header>

          <main className="app__main">
            <Mirror ref={videoRef} stage={stage} progress={progress} live={entered} />
            <div className="app__side">
              <SpiritBoard reading={reading} judgement={judgement} mine={prefs.allergens} speaking={speaking} onMore={() => run("more")} onRepeat={() => run("repeat")} />
              <Haul items={haul} onSpeak={() => run("haul")} onEmpty={() => (setHaul([]), void say("Your haul is empty."))} />
            </div>
          </main>

          <footer className="app__foot">
            <p>
              Label data from <a href="https://world.openfoodfacts.org">Open Food Facts</a> (ODbL). Wrapper reading by a vision model: always ask someone to confirm a warning. Nothing you show the mirror is stored.
            </p>
            <p>
              {prefs.allergens.length ? `Warning about: ${prefs.allergens.map(allergenLabel).join(", ")}.` : "No allergens set: press S to add yours."}
            </p>
          </footer>

          <Settings open={settingsOpen} prefs={prefs} listenSupported={listenSupported()} onChange={setPrefs} onClose={() => setSettingsOpen(false)} />
        </>
      )}
    </div>
  );
}

const voiceBusy = () => typeof speechSynthesis !== "undefined" && speechSynthesis.speaking;

function stageLine(stage: Stage, auto: boolean): string {
  switch (stage) {
    case "watching":
      return auto ? "Watching: hold a treat still to read it" : "Watching: press Space to read";
    case "sensing":
      return "Something stirs before the glass";
    case "still":
      return "Hold it still…";
    case "scrying":
      return "Scrying…";
    case "speaking":
      return "The spirit speaks";
    case "dark":
      return "Too dark: turn on a light";
  }
}
