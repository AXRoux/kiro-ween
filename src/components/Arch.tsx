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

/** The window, in the viewBox the stone overlay is drawn in. The frame keeps this aspect at every size. */
const VB = { w: 364, h: 296 };
const ARCH = "M0 296V112C0 52 112 28 182 4C252 28 364 52 364 112V296Z";
const SIDE_L = "M0 296V112C0 52 112 28 182 4";
const SIDE_R = "M364 296V112C364 52 252 28 182 4";

interface Props {
  stage: Stage;
  /** 0..1 while the treat is held still. */
  progress: number;
  live: boolean;
  autoScan: boolean;
  onRead: () => void;
}

/**
 * The castle window: the camera view, framed in a pointed stone arch. Before the gate is opened a portcullis is down
 * across it; it winds up when the camera starts.
 *
 * The whole window is one big button, "Read now": the largest target on the screen does the most important thing,
 * so it can be found by touch without looking. Candlelight climbs both sides of the frame while the treat is held
 * still and meets at the keystone when the castle reads; a beam of moonlight sweeps down while it reads; the frame
 * glows in the verdict's colour while it speaks. A chip at the foot of the window names the step, with the key to
 * press. All of it is also spoken.
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

        <svg className="arch__stone" viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <clipPath id="archClip">
              <path d={ARCH} />
            </clipPath>
            <linearGradient id="archStone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6a6280" />
              <stop offset="1" stopColor="#3a3448" />
            </linearGradient>
            <linearGradient id="iron" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#15121a" />
              <stop offset="0.45" stopColor="#4d4657" />
              <stop offset="1" stopColor="#15121a" />
            </linearGradient>
          </defs>
          {/* the portcullis: an iron grate with spiked feet, wound up out of sight once the gate is open */}
          <g clipPath="url(#archClip)">
            <g className="portcullis">
              <rect width={VB.w} height={VB.h} fill="rgba(8, 5, 12, .35)" />
              {Array.from({ length: 8 }, (_, i) => 6 + i * 50.5).map((x) => (
                <g key={x}>
                  <rect x={x - 5} y="-4" width="10" height={VB.h - 4} fill="url(#iron)" />
                  <path d={`M${x - 5} ${VB.h - 8}h10l-5 14z`} fill="#3a3443" />
                </g>
              ))}
              {[34, 92, 150, 208, 262].map((y) => (
                <g key={y}>
                  <rect x="0" y={y - 4} width={VB.w} height="8" fill="url(#iron)" opacity="0.95" />
                  <path d={`M0 ${y - 4}h${VB.w}`} stroke="#8a8199" strokeOpacity="0.5" strokeWidth="1" />
                </g>
              ))}
              {Array.from({ length: 8 }, (_, i) => 6 + i * 50.5).flatMap((x) =>
                [34, 92, 150, 208, 262].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="#776e86" stroke="#0d0b12" />),
              )}
            </g>
          </g>

          {/* the wall around the window, then the cut-stone frame and its keystone */}
          <path d={`M-4 -4H${VB.w + 4}V${VB.h + 4}H-4Z${ARCH}`} fillRule="evenodd" className="arch__wall" />
          <path d={ARCH} fill="none" stroke="#0a080e" strokeWidth="20" />
          <path d={ARCH} fill="none" stroke="url(#archStone)" strokeWidth="14" />
          <path d={ARCH} fill="none" stroke="#0a080e" strokeWidth="14" strokeDasharray="1.6 30" />
          <path d={ARCH} fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="1.2" transform="translate(0 -5)" />
          <path className="arch__lit" d={SIDE_L} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lit} />
          <path className="arch__lit" d={SIDE_R} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lit} />
          <path d="M170 -2h24l-4 22h-16z" fill="url(#archStone)" stroke="#0a080e" strokeWidth="1.5" />
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

/** Where to hold it: corner brackets and the outline of a wrapped bar, for anyone helping. */
function HoldGuide() {
  return (
    <svg className="arch__guide" viewBox="0 0 200 140" aria-hidden="true">
      <path className="arch__guide-corners" d="M6 30V6h24M170 6h24v24M194 110v24h-24M30 134H6v-24" />
      <path className="arch__guide-candy" d="M38 50h124l10-10v60l-10-10H38l-10 10V40z" />
    </svg>
  );
}
