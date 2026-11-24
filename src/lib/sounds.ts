/**
 * Sound cues, synthesised with Web Audio (no files, nothing to license). Each one means one thing, so a blind user
 * learns them quickly: heartbeat = something is in front of the camera, chime = read, toll = beware, creak = nothing seen,
 * gate = the portcullis is up and the castle is listening.
 */
let ctx: AudioContext | null = null;
let enabled = localStorage.getItem("tor.sounds") !== "off";

const ac = () => (ctx ??= new AudioContext());

function tone(freq: number, start: number, dur: number, { type = "sine" as OscillatorType, gain = 0.2, glide = 0 } = {}) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + glide), a.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

/** A bell: a few inharmonic partials with long decays. */
function bell(base: number, gain: number, decay: number) {
  [1, 2.01, 2.76, 4.07, 5.43].forEach((m, i) => tone(base * m, 0, decay / (1 + i * 0.6), { gain: gain / (1 + i * 1.4) }));
}

function noise(dur: number, from: number, to: number, gain = 0.08) {
  const a = ac();
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 9;
  f.frequency.setValueAtTime(from, a.currentTime);
  f.frequency.exponentialRampToValueAtTime(to, a.currentTime + dur);
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

const play = (fn: () => void) => {
  if (!enabled) return;
  try {
    void ac().resume();
    fn();
  } catch {
    /* audio unavailable: speech still carries everything */
  }
};

export const sounds = {
  get enabled() {
    return enabled;
  },
  setEnabled(on: boolean) {
    enabled = on;
    localStorage.setItem("tor.sounds", on ? "on" : "off");
  },
  unlock: () => play(() => void 0),
  heartbeat: () => play(() => (tone(58, 0, 0.16, { gain: 0.5 }), tone(52, 0.2, 0.2, { gain: 0.38 }))),
  chime: () => play(() => bell(880, 0.12, 1.6)),
  safe: () => play(() => (bell(660, 0.1, 1.2), setTimeout(() => bell(990, 0.08, 1.4), 160))),
  toll: () => play(() => (bell(110, 0.32, 3.4), tone(55, 0, 2.2, { type: "triangle", gain: 0.12 }))),
  creak: () => play(() => noise(0.7, 260, 900, 0.12)),
  /** The portcullis winding up: a ratchet clicking on its chain, a groan of old wood, then a low thud as it locks. */
  gate: () =>
    play(() => {
      for (let i = 0; i < 9; i++) setTimeout(() => noise(0.035, 1800 + i * 90, 3800, 0.1), i * 95);
      noise(0.95, 140, 420, 0.07);
      setTimeout(() => (tone(70, 0, 0.5, { type: "triangle", gain: 0.3, glide: -30 }), bell(220, 0.05, 1.2)), 900);
    }),
};
