import { forwardRef } from "react";
import "../styles/arch.css";

export type Stage = "watching" | "sensing" | "still" | "reading" | "speaking" | "dark";

/** The chip at the foot of the window names the step. Spoken too, so it is hidden from screen readers. */
const STATUS: Record<Stage, string> = {
  watching: "Hold up a treat, or tap",
  sensing: "Something's there…",
  still: "Hold it still…",
  reading: "Reading the wrapper…",
  speaking: "Tap to read again",
  dark: "Too dark: turn on a light",
};

/** The window, in the viewBox the iron is drawn in. The frame keeps this aspect at every size. */
const VB = { w: 364, h: 264 };
const ARCH = "M0 264V104C0 48 110 26 182 4C254 26 364 48 364 104V264Z";
const SIDE_L = "M0 264V104C0 48 110 26 182 4";
const SIDE_R = "M364 264V104C364 48 254 26 182 4";

interface Props {
  stage: Stage;
  /** 0..1 while the treat is held still. */
  progress: number;
  live: boolean;
  autoScan: boolean;
  onRead: () => void;
}

/**
 * The gate: the camera view, framed in a pointed wrought-iron arch. Before the gate is opened its two scrollwork
 * doors are shut across the window with torchlight glowing behind them; they swing open when the camera starts.
 *
 * The whole window is one big button, "Read now": the largest target on the screen does the most important thing,
 * so it can be found by touch without looking. Candlelight climbs both sides of the arch while the treat is held
 * still and meets at the crest when the castle reads; a beam of moonlight sweeps down while it reads; the iron glows
 * in the verdict's colour while it speaks. A chip at the foot of the window names the step, with the key to press.
 * All of it is also spoken.
 */
export const Arch = forwardRef<HTMLVideoElement, Props>(function Arch({ stage, progress, live, autoScan, onRead }, video) {
  const status = stage === "watching" && !autoScan ? "Tap to read" : STATUS[stage];
  const lit = stage === "still" ? progress : stage === "reading" || stage === "speaking" ? 1 : 0;
  return (
    <section className="arch" data-stage={live ? stage : "off"} aria-labelledby="arch-title">
      <h2 id="arch-title" className="sr-only">
        Camera
      </h2>
      <div className="arch__frame">
        <video ref={video} className="arch__video" playsInline muted autoPlay aria-hidden="true" />
        <div className="arch__torchlight" aria-hidden="true" />
        <div className="arch__beam" aria-hidden="true" />
        {live && stage === "watching" ? <HoldGuide /> : null}

        {/* the two doors, each hinged at its outer edge */}
        <div className="arch__doors" aria-hidden="true">
          <Door side="left" />
          <Door side="right" />
        </div>

        <svg className="arch__iron" viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="archWall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1a1526" />
              <stop offset="1" stopColor="#100d17" />
            </linearGradient>
          </defs>
          {/* the wall around the window */}
          <path d={`M-4 -4H${VB.w + 4}V${VB.h + 4}H-4Z${ARCH}`} fillRule="evenodd" fill="url(#archWall)" />
          {/* scrolls in the two upper corners */}
          <g className="arch__ornament">
            <path d={scroll(40, 34, 20, 1)} />
            <path d={scroll(324, 34, 20, -1)} />
            <path d="M6 66C18 44 40 30 70 22M358 66C346 44 324 30 294 22" />
          </g>
          {/* the iron frame: a dark band, a violet rim of moonlight, and the candlelight that climbs it */}
          <path d={ARCH} className="arch__band" />
          <path d={ARCH} className="arch__rim" />
          <path className="arch__lit" d={SIDE_L} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lit} />
          <path className="arch__lit" d={SIDE_R} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lit} />
          {/* the crest: a spear finial at the apex, and two at the shoulders */}
          <path className="arch__finial" d="M182 -6l7 12h-4v8h-6v-8h-4z" />
          <path className="arch__finial" d="M4 94l5 10h-10zM360 94l5 10h-10z" />
        </svg>

        {/* the button that is the whole window; the chip over it names the step (and is not part of its name) */}
        <button type="button" className="arch__read" onClick={onRead} disabled={!live} aria-label="Read now" aria-keyshortcuts="Space" />
        {live ? (
          <span className="arch__cue" aria-hidden="true">
            <span className="arch__lamp" />
            {status}
            {stage === "watching" || stage === "speaking" ? <kbd>Space</kbd> : null}
          </span>
        ) : null}
      </div>
    </section>
  );
});

/** A C-scroll: a spiral of iron winding in, `dir` 1 clockwise or -1. */
function scroll(cx: number, cy: number, r: number, dir: 1 | -1): string {
  const pts: string[] = [];
  const turns = Math.PI * 1.75;
  for (let i = 0; i <= 28; i++) {
    const t = (i / 28) * turns;
    const rr = r * (1 - (0.72 * i) / 28);
    pts.push(`${(cx + dir * Math.cos(t + Math.PI) * rr).toFixed(1)} ${(cy + Math.sin(t + Math.PI) * rr).toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}

/** One gate door: bars, two rails, a band of scrolls between them, and half of the medallion where they meet. */
function Door({ side }: { side: "left" | "right" }) {
  const x0 = side === "left" ? 0 : 182;
  const mirror = side === "right" ? -1 : 1;
  const edge = side === "left" ? 182 : 182; // where the doors meet
  const bars = [22, 44, 66, 88, 110, 132, 154].map((d) => (side === "left" ? d : 364 - d));
  const scrolls = [46, 92, 138].map((d) => (side === "left" ? d : 364 - d));
  return (
    <svg className={`arch__door arch__door--${side}`} viewBox={`${x0} 0 182 ${VB.h}`} preserveAspectRatio="none">
      <defs>
        <clipPath id={`doorClip-${side}`}>
          <path d={ARCH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#doorClip-${side})`}>
        <rect x={x0} y="0" width="182" height={VB.h} className="door__shade" />
        {bars.map((x) => (
          <path key={x} d={`M${x} 0V${VB.h}`} className="door__bar" />
        ))}
        <path d={`M${x0} 118H${x0 + 182}M${x0} 124H${x0 + 182}M${x0} 194H${x0 + 182}M${x0} 200H${x0 + 182}`} className="door__rail" />
        {scrolls.map((x, i) => (
          <path key={x} d={scroll(x, 159, 16, (i % 2 ? -1 : 1) * mirror as 1 | -1)} className="door__scroll" />
        ))}
        <path d={`M${edge} 0V${VB.h}`} className="door__stile" />
        <path d={`M${side === "left" ? 2 : 362} 0V${VB.h}`} className="door__stile" />
        {/* dog bars along the bottom */}
        {[11, 33, 55, 77, 99, 121, 143, 165].map((d) => {
          const x = side === "left" ? d : 364 - d;
          return <path key={d} d={`M${x} 232V${VB.h}`} className="door__dog" />;
        })}
        <path d={`M${x0} 232H${x0 + 182}`} className="door__rail" />
        {/* the medallion and its keyhole, split between the two doors */}
        <circle cx={edge} cy="159" r="20" className="door__medallion" />
        <circle cx={edge} cy="159" r="9" className="door__keyhole" />
      </g>
    </svg>
  );
}

/** Where to hold it: corner brackets and the outline of a wrapped bar, for anyone helping. */
function HoldGuide() {
  return (
    <svg className="arch__guide" viewBox="0 0 200 140" aria-hidden="true">
      <path className="arch__guide-corners" d="M6 30V6h24M170 6h24v24M194 110v24h-24M30 134H6v-24" />
      <path className="arch__guide-candy" d="M38 50h124l10-10v60l-10-10H38l-10 10V40z" />
    </svg>
  );
}
