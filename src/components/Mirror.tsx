import { forwardRef } from "react";
import "../styles/mirror.css";

export type Stage = "watching" | "sensing" | "still" | "scrying" | "speaking" | "dark";

const PLAQUE: Record<Stage, string> = {
  watching: "Hold a treat to the glass",
  sensing: "Something stirs…",
  still: "Hold it still…",
  scrying: "The spirit is reading",
  speaking: "The spirit speaks",
  dark: "Too dark to see",
};

/**
 * The scrying mirror. The gilded arch shows exactly where to hold the candy, the glass mists while the spirit reads
 * and clears when it speaks, and the four runes show the step: Sense, Still, Scry, Speak. The candles burn in the
 * verdict's colour. All of it is mirrored by speech and the Announcer, so nothing here is the only signal.
 */
export const Mirror = forwardRef<HTMLVideoElement, { stage: Stage; progress: number; live: boolean }>(function Mirror({ stage, progress, live }, video) {
  const step = stage === "sensing" ? 0 : stage === "still" ? 1 : stage === "scrying" ? 2 : stage === "speaking" ? 3 : -1;
  return (
    <section className="mirror" data-stage={stage} aria-label="The scrying mirror">
      <Candle side="left" />
      <div className="mirror__body">
        <Crest />
        <div className="mirror__frame">
          <div className="mirror__bevel">
            <div className="mirror__glass">
              <video ref={video} className="mirror__video" playsInline muted autoPlay aria-label="Camera view" />
              <div className="mirror__mist mirror__mist--a" aria-hidden="true" />
              <div className="mirror__mist mirror__mist--b" aria-hidden="true" />
              <div className="mirror__sheen" aria-hidden="true" />
              {live && stage === "watching" ? <HoldGuide /> : null}
              {!live ? (
                <p className="mirror__sleep" aria-hidden="true">
                  The glass is dark
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mirror__plaque" aria-hidden="true">
          <span>{PLAQUE[stage]}</span>
        </div>
      </div>
      <Candle side="right" />

      <ol className="runes" aria-label="Steps">
        {RUNES.map((r, i) => (
          <li key={r.name} className="rune" data-state={i === step ? "now" : i < step ? "done" : "wait"} aria-current={i === step ? "step" : undefined}>
            <span className="rune__sigil" aria-hidden="true">
              {r.name === "Still" ? <ProgressRing value={stage === "still" ? progress : step > 1 ? 1 : 0} /> : null}
              <svg viewBox="0 0 48 48">{r.sigil}</svg>
            </span>
            <span className="rune__name">{r.name}</span>
          </li>
        ))}
      </ol>
    </section>
  );
});

const RUNES = [
  {
    name: "Sense",
    sigil: (
      <>
        <path d="M5 24c6-9 12-13 19-13s13 4 19 13c-6 9-12 13-19 13S11 33 5 24z" />
        <circle cx="24" cy="24" r="6.5" />
        <circle cx="24" cy="24" r="2" className="fill" />
      </>
    ),
  },
  {
    name: "Still",
    sigil: (
      <>
        <path d="M16 8h16M16 40h16M18 8c0 8 12 9 12 16s-12 8-12 16M30 8c0 8-12 9-12 16s12 8 12 16" />
      </>
    ),
  },
  {
    name: "Scry",
    sigil: (
      <>
        <circle cx="24" cy="21" r="12" />
        <path d="M17 17c2-3 5-4 8-4" />
        <path d="M14 40h20l-3-6H17z" />
      </>
    ),
  },
  {
    name: "Speak",
    sigil: (
      <>
        <path d="M8 19h7l9-7v24l-9-7H8z" />
        <path d="M31 18c2 2 2 10 0 12M36 14c4 4 4 16 0 20" />
      </>
    ),
  },
];

function ProgressRing({ value }: { value: number }) {
  const c = 2 * Math.PI * 27;
  return (
    <svg className="rune__ring" viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="27" strokeDasharray={c} strokeDashoffset={c * (1 - value)} />
    </svg>
  );
}

/** Where to hold it: a ghostly outline of a candy bar, for anyone helping. */
function HoldGuide() {
  return (
    <svg className="mirror__guide" viewBox="0 0 200 110" aria-hidden="true">
      <path d="M22 30h156l10-10v70l-10-10H22l-10 10V20z" />
    </svg>
  );
}

function Crest() {
  return (
    <svg className="mirror__crest" viewBox="0 0 260 90" aria-hidden="true">
      <defs>
        <linearGradient id="crestGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe7a8" />
          <stop offset="0.45" stopColor="#c99a3f" />
          <stop offset="1" stopColor="#5e3f12" />
        </linearGradient>
      </defs>
      <g fill="url(#crestGold)" stroke="#3a2608" strokeWidth="1.2">
        <path d="M130 6c-8 10-20 14-34 14-16 0-26 8-30 22 10-6 20-8 30-6-8 6-12 14-12 24 8-10 18-15 30-16 6 0 12 2 16 6 4-4 10-6 16-6 12 1 22 6 30 16 0-10-4-18-12-24 10-2 20 0 30 6-4-14-14-22-30-22-14 0-26-4-34-14z" />
        <path d="M130 30c-10 0-16 8-16 18s6 18 16 22c10-4 16-12 16-22s-6-18-16-18z" />
      </g>
      <path d="M135 37a12 12 0 1 0 0 24 15 15 0 1 1 0-24z" fill="#f4ecd9" opacity="0.92" />
      <circle cx="130" cy="78" r="5" fill="var(--verdict)" className="mirror__gem" />
    </svg>
  );
}

function Candle({ side }: { side: "left" | "right" }) {
  return (
    <div className={`candle candle--${side}`} aria-hidden="true">
      <div className="candle__halo" />
      <div className="candle__flame">
        <span className="candle__core" />
      </div>
      <svg className="candle__wax" viewBox="0 0 60 160">
        <defs>
          <linearGradient id={`wax-${side}`} x1="0" x2="1">
            <stop offset="0" stopColor="#a89a80" />
            <stop offset="0.35" stopColor="#f6eedb" />
            <stop offset="0.7" stopColor="#e2d5b8" />
            <stop offset="1" stopColor="#8c7f66" />
          </linearGradient>
        </defs>
        <path d="M30 2v10" stroke="#2a1a0c" strokeWidth="2.4" />
        <path d="M10 14c6-3 34-3 40 0v140H10z" fill={`url(#wax-${side})`} />
        <path d="M14 15c-1 10 2 16 1 26-1 6 3 8 4 2 1-9-1-16 3-27M38 15c0 8 3 12 2 19 0 5 3 6 4 1 1-8-1-12 1-20" fill="#f9f3e4" opacity="0.9" />
        <ellipse cx="30" cy="14" rx="20" ry="4" fill="#fff8e8" />
        <rect x="4" y="150" width="52" height="10" rx="3" fill="#3a2410" />
      </svg>
    </div>
  );
}
