import { useCallback, useEffect, useRef, useState } from "react";
import { Arch, type Stage } from "./components/Arch";
import { Scene, SCENE } from "./components/Scene";
import { Dock } from "./components/Dock";
import { Gate } from "./components/Gate";
import { Haul } from "./components/Haul";
import { Settings, type Prefs } from "./components/Settings";
import { StatusBar } from "./components/StatusBar";
import { Verdict } from "./components/Verdict";
import { allergenLabel } from "./lib/allergens";
import { readBarcode } from "./lib/barcode";
import { CameraError, captureJpeg, FrameSampler, openCamera } from "./lib/camera";
import { addToHaul, type HaulItem } from "./lib/haul";
import { haptics, hapticsSupported } from "./lib/haptics";
import { identifyFrame } from "./lib/identify";
import { listenSupported, startListening, type Command } from "./lib/listen";
import { Stillness, toLuma } from "./lib/motion";
import { lookupBarcode } from "./lib/openfoodfacts";
import { details, GREETING, guidance, haulSummary, HELP, NO_KEY, summary, TOO_DARK } from "./lib/phrasing";
import { merge } from "./lib/reading";
import { sounds } from "./lib/sounds";
import { emptyReading, type Judgement, type Reading } from "./lib/types";
import { judge } from "./lib/verdict";
import { asVoiceStyle, voice } from "./lib/voice";
import { keepAwake } from "./lib/wakelock";
import "./styles/app.css";

const DEFAULT_PREFS: Prefs = { allergens: [], output: "voice", voiceStyle: "serena", rate: 1, autoScan: true, sounds: true, haptics: true, listening: false, hyperlegible: false };
const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};
const CAMERA_PROBLEM: Record<CameraError["reason"], string> = {
  denied: "I need your camera to see your treats. Allow camera access for this page in your browser's settings, then press Open the gate again.",
  missing: "I can't find a camera. Plug one in, or open this page on a phone, then press Open the gate again.",
  unsupported: "This browser can't share a camera with web pages. Try Chrome, Edge, Safari or Firefox.",
  failed: "The camera would not start. Close other apps that might be using it, then press Open the gate again.",
};
const VOICE_HELLO = { serena: "I'm Serena. Let's see what you got tonight.", ana: "I'm Ana. I'll read every treat to you, slowly and clearly." } as const;

/**
 * The castle. A small state machine: watching → sensing → still → reading → speaking → watching (plus dark).
 * Everything the screen shows is also said, either by the castle's voice or through the live region for the user's
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
  const [prefs, setPrefsState] = useState<Prefs>(() => {
    const p = load("tor.prefs", DEFAULT_PREFS);
    return { ...p, voiceStyle: asVoiceStyle(p.voiceStyle) };
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [haulOpen, setHaulOpen] = useState(false);
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
    haptics.setEnabled(p.haptics);
    // Speak back what changed (Requirement 6.2).
    if (p.allergens.join() !== before.allergens.join()) {
      say(p.allergens.length ? `I'll warn you about ${p.allergens.map((a) => allergenLabel(a).toLowerCase()).join(", ")}.` : "I won't warn about any allergens.");
    } else if (p.voiceStyle !== before.voiceStyle) say(VOICE_HELLO[p.voiceStyle]);
    else if (p.output !== before.output) say(p.output === "voice" ? "I'll speak for myself." : "Your screen reader will speak for me.");
    else if (p.autoScan !== before.autoScan) say(p.autoScan ? "I'll read on my own when you hold a treat still." : "I'll wait for you to tap the window or press space.");
    else if (p.haptics !== before.haptics) say(p.haptics ? "I'll vibrate with each answer." : "No more vibrating.");
    else if (p.hyperlegible !== before.hyperlegible) say(p.hyperlegible ? "Easier-to-read letters are on." : "Easier-to-read letters are off.");
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
    haptics.setEnabled(prefs.haptics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Says something the right way for this user: the castle's voice, or the live region for their screen reader. */
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

  // ---------------------------------------------------------------- reading a treat
  const scan = useCallback(
    async (trigger: "auto" | "manual") => {
      if (busyRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        void say("The camera can't see yet. Give it a moment.");
        return;
      }
      busyRef.current = true;
      setStage("reading");
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
          else if (seen && !seen.ok && seen.reason === "failed") await say("I got no answer. Hold it still and try again.");
          else if (visionRef.current === false) await say(code ? `I found barcode ${code.split("").join(" ")}, but no label for it. ${NO_KEY}` : NO_KEY);
          else await say(guidance(result ?? emptyReading("vision")));
          return;
        }

        const mine = prefsRef.current.allergens;
        const j = judge(result, mine);
        setReading(result);
        setJudgement(j);
        lastRef.current = { reading: result, judgement: j };
        setHaul((h) => addToHaul(h, result.name || "A treat", j.verdict));
        if (j.verdict === "beware") sounds.toll();
        else if (j.verdict === "safe") sounds.safe();
        else sounds.chime();
        haptics.buzz(j.verdict);
        setStage("speaking");
        await say(summary(result, j, mine), j.verdict === "beware");
      } finally {
        busyRef.current = false;
        if (stageRef.current === "speaking" || stageRef.current === "reading") setStage("watching");
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
          return void say(last ? details(last.reading) : "Read a treat first, then ask for more.");
        case "haul":
          setSettingsOpen(false);
          setHaulOpen(true);
          return void say(haulSummary(haulRef.current));
        case "help":
          return void say(HELP);
        case "hush":
          voice.hush();
          return;
        case "settings":
          setHaulOpen(false);
          setSettingsOpen(true);
          return;
        case "voice":
          return setPrefs({ ...prefsRef.current, voiceStyle: prefsRef.current.voiceStyle === "serena" ? "ana" : "serena" });
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
      if (settingsOpen || haulOpen || e.metaKey || e.ctrlKey || e.altKey) return;
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
  }, [entered, settingsOpen, haulOpen, run]);

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
      if (tick.phase === "steadying" && !wasSteadying) {
        sounds.heartbeat();
        haptics.buzz("steady");
      }
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
      sounds.gate();
      haptics.buzz("open");
      setEntered(true);
      const health = (await fetch("/api/health")
        .then((r) => r.json())
        .catch(() => null)) as { vision?: boolean; speech?: boolean } | null;
      visionRef.current = health ? Boolean(health.vision) : null;
      voice.setServerVoice(Boolean(health?.speech));
      voice.prefetch([HELP, VOICE_HELLO.serena, VOICE_HELLO.ana]);
      void say(visionRef.current === false ? `${GREETING} Wrapper reading is off on this server, so show me barcodes.` : GREETING);
    } catch (e) {
      const text = e instanceof CameraError ? CAMERA_PROBLEM[e.reason] : CAMERA_PROBLEM.failed;
      setProblem(text);
      void voice.say(text);
    } finally {
      setGateBusy(false);
    }
  };

  // A blind user can't see the screen dim: keep it awake while the camera is on.
  useEffect(() => (entered ? keepAwake() : undefined), [entered]);

  useEffect(() => {
    const v = videoRef.current;
    if (!entered || !v || !streamRef.current) return;
    v.srcObject = streamRef.current;
    void v.play().catch(() => undefined);
  }, [entered]);

  const verdict = stage === "reading" ? undefined : judgement?.verdict;
  const layout = useLayout();
  // Easier-to-read letters: Atkinson Hyperlegible everywhere (global.css)
  useEffect(() => void document.documentElement.classList.toggle("hyperlegible", prefs.hyperlegible), [prefs.hyperlegible]);
  const haulCount = haul.reduce((n, i) => n + i.count, 0);

  return (
    <main className={desktop ? "app app--desktop" : layout.bare ? "app app--bare" : "app"} data-verdict={verdict}>
      <div className="sr-only" aria-live="polite" role="status">
        {polite}
      </div>
      <div className="sr-only" aria-live="assertive" role="alert">
        {assertive}
      </div>

      <div className="stage" style={layout.bare || desktop ? undefined : { width: SCENE.w * layout.scale, height: SCENE.h * layout.scale }}>
        <div className="stage__inner" style={layout.bare ? undefined : { transform: `scale(${layout.scale})` }}>
          <Scene desktop={desktop} bare={layout.bare} stage={stage} live={entered} onClose={() => window.castle?.close()} onMinimize={() => window.castle?.minimize()}>
            <div className="screen" data-live={entered}>
              <StatusBar live={entered} speaking={speaking} listening={entered && prefs.listening} onHush={() => run("hush")} />
              <Arch ref={videoRef} stage={stage} progress={progress} live={entered} autoScan={prefs.autoScan} onRead={() => run("scan")} />
              {entered ? <Verdict reading={reading} judgement={judgement} mine={prefs.allergens} busy={stage === "reading"} /> : <Gate onEnter={enter} problem={problem} busy={gateBusy} />}
              <Dock
                live={entered}
                hasReading={Boolean(reading)}
                haulCount={haulCount}
                onRepeat={() => run("repeat")}
                onMore={() => run("more")}
                onHaul={() => (entered ? run("haul") : setHaulOpen(true))}
                onSettings={() => run("settings")}
              />
              <span className="screen__home" aria-hidden="true" />
            </div>
          </Scene>
        </div>
      </div>

      <Settings open={settingsOpen} prefs={prefs} listenSupported={listenSupported()} hapticsSupported={hapticsSupported()} onChange={setPrefs} onClose={() => setSettingsOpen(false)} />
      <Haul open={haulOpen} items={haul} onSpeak={() => void say(haulSummary(haul))} onEmpty={() => (setHaul([]), void say("Your haul is empty."))} onClose={() => setHaulOpen(false)} />
    </main>
  );
}

const desktop = typeof window !== "undefined" && Boolean(window.castle?.desktop);

/**
 * How to lay the scene out. The desktop window is always the scene's exact size (Electron's zoom resizes the window
 * instead). In a browser the scene scales down to fit, but never below 80%, so text stays at least that close to the
 * size it was designed at. On a phone (a narrow screen) the device already is the phone, so the painting comes off
 * and the screen fills the page; the same happens when a low-vision user zooms in past what fits, so text keeps the
 * size they asked for (WCAG 1.4.10).
 */
function useLayout(): { bare: boolean; scale: number } {
  const measure = () => {
    if (desktop) return { bare: false, scale: 1 };
    if (innerWidth < 600) return { bare: true, scale: 1 };
    const scale = Math.min(1, (innerWidth - 24) / SCENE.w, (innerHeight - 24) / SCENE.h);
    return scale < 0.8 ? { bare: true, scale: 1 } : { bare: false, scale };
  };
  const [layout, setLayout] = useState(measure);
  useEffect(() => {
    const on = () => setLayout(measure());
    addEventListener("resize", on);
    return () => removeEventListener("resize", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return layout;
}

const voiceBusy = () => typeof speechSynthesis !== "undefined" && speechSynthesis.speaking;

