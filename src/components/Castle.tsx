import type { ReactNode } from "react";
import type { Stage } from "./Arch";
import { Ghosts } from "./Ghosts";
import "../styles/castle.css";

/**
 * The costume: a phone-sized app wearing a stone castle as its case. Four round turrets are the corner bumpers, a
 * crenellated wall runs along the top with a gatehouse in the middle, ivy climbs the left side, and the name is
 * carved into the foundation stones under the screen. In the desktop app the window is transparent outside this
 * silhouette, so the castle stands on the desktop like an object you could pick up.
 *
 * The case carries state as well as costume: the gatehouse window and the turrets' arrow slits glow in the verdict's
 * colour (moonlight idle, green safe, amber ask someone, red beware), and flicker while the castle reads.
 * All of it is aria-hidden; the screen inside says and shows everything.
 *
 * Ghosts haunt the air outside the walls (Ghosts.tsx).
 *
 * On a real phone, or when there isn't room (a narrow or zoomed-in browser), the case is left off and the screen
 * fills the page: the device is already the phone.
 */
export const CASE = { w: 460, h: 880 };
/** Where the screen sits inside the case. Mirrored in castle.css (.castle__screen). */
export const SCREEN = { x: 34, y: 62, w: 392, h: 752, r: 42 };
/**
 * The haunted air around the case, where the ghosts fly: wide at the sides, a strip of sky on top. In the desktop app
 * the ghosts have their own window, this much bigger than the castle's, that never takes the mouse (electron/main.ts).
 */
export const HALO = { x: 110, top: 32, bottom: 8 };

interface Props {
  children: ReactNode;
  stage: Stage;
  live: boolean;
  desktop: boolean;
  /** No case: the screen fills the page. */
  bare: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

export function Castle({ children, stage, live, desktop, bare, onClose, onMinimize }: Props) {
  if (bare) return <div className="castle castle--bare">{children}</div>;
  return (
    <div className="castle" data-stage={live ? stage : "off"} style={{ width: CASE.w, height: CASE.h }}>
      <Case />
      <div className="castle__screen">{children}</div>
      {/* in the desktop app the ghosts fly in their own window, around this one */}
      {desktop ? null : <Ghosts />}
      <div className="castle__nameplate" aria-hidden="true">
        Trick or Read
      </div>
      {desktop ? (
        <div className="castle__controls">
          <button type="button" className="stud stud--close" onClick={onClose} aria-label="Close Trick or Read">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
          <button type="button" className="stud" onClick={onMinimize} aria-label="Minimise Trick or Read">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5.5 10h9" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------------- the stone */

const BODY = { x0: 16, y0: 40, x1: 444, y1: 872 };
const TURRET_W = 60;
const TURRETS = { left: 2, right: CASE.w - 2 - TURRET_W, top: 22, topH: 150, bottom: 728 };
const GATEHOUSE = { x0: 172, x1: 288, y0: 10, y1: 52 };

/** Merlons (the raised teeth of a battlement) from x0 to x1, `w` wide with `gap` between, standing on `base`. */
function merlons(x0: number, x1: number, base: number, h: number, w: number, gap: number): string {
  const n = Math.floor((x1 - x0 + gap) / (w + gap));
  const start = x0 + (x1 - x0 - (n * w + (n - 1) * gap)) / 2;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = start + i * (w + gap);
    d += `M${x} ${base}V${base - h + 2}q0-2 2-2h${w - 4}q2 0 2 2V${base}Z`;
  }
  return d;
}

/** Horizontal stone courses across a turret, with staggered vertical joints. */
function courses(x: number, y0: number, y1: number, w: number, step = 15): string {
  let d = "";
  for (let y = y0 + step, i = 0; y < y1 - 4; y += step, i++) {
    d += `M${x + 2} ${y}H${x + w - 2}`;
    const j = i % 2 ? [0.3, 0.72] : [0.5];
    for (const f of j) d += `M${x + w * f} ${y - step}V${y}`;
  }
  return d;
}

const ROUNDED_BODY = `M${BODY.x0 + 40} ${BODY.y0}H${BODY.x1 - 40}Q${BODY.x1} ${BODY.y0} ${BODY.x1} ${BODY.y0 + 40}V${BODY.y1 - 52}Q${BODY.x1} ${BODY.y1} ${BODY.x1 - 52} ${BODY.y1}H${BODY.x0 + 52}Q${BODY.x0} ${BODY.y1} ${BODY.x0} ${BODY.y1 - 52}V${BODY.y0 + 40}Q${BODY.x0} ${BODY.y0} ${BODY.x0 + 40} ${BODY.y0}Z`;

function Case() {
  const { x, y, w, h, r } = SCREEN;
  return (
    <svg className="castle__case" viewBox={`0 0 ${CASE.w} ${CASE.h}`} aria-hidden="true">
      <defs>
        <linearGradient id="stone" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#5d566e" />
          <stop offset="0.35" stopColor="#433d51" />
          <stop offset="1" stopColor="#25212e" />
        </linearGradient>
        <linearGradient id="stoneDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3548" />
          <stop offset="1" stopColor="#1f1b27" />
        </linearGradient>
        {/* a round tower: dark at both edges, lit from the moon on the upper right */}
        <linearGradient id="tower" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1c1923" />
          <stop offset="0.3" stopColor="#4a4459" />
          <stop offset="0.62" stopColor="#6a6280" />
          <stop offset="0.85" stopColor="#3e384c" />
          <stop offset="1" stopColor="#16131c" />
        </linearGradient>
        <linearGradient id="moonlight" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8ceff" stopOpacity="0.22" />
          <stop offset="0.45" stopColor="#d8ceff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3a3" />
          <stop offset="0.5" stopColor="#d9a54a" />
          <stop offset="1" stopColor="#8a5f1c" />
        </linearGradient>
        <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#efe8ff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#efe8ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="moonFace" cx="0.4" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#fffdf3" />
          <stop offset="0.7" stopColor="#e9e2cc" />
          <stop offset="1" stopColor="#b9b29c" />
        </radialGradient>
        {/* ashlar: rows of cut blocks, each row offset from the last */}
        <pattern id="ashlar" width="96" height="32" patternUnits="userSpaceOnUse">
          <path d="M0 .75h96M0 16.75h96M44 0v16M0 16v16M30 16v16M74 16v16" stroke="#0d0b12" strokeOpacity="0.85" strokeWidth="1.5" fill="none" />
          <path d="M1 2.2h42M45 2.2h50M1 18.2h28M31 18.2h42M75 18.2h20" stroke="#fff" strokeOpacity="0.07" strokeWidth="1" fill="none" />
        </pattern>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 -0.12" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="stain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="3" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.09  0 0 0 0 0.04  0 0 0 1.4 -0.62" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="castShadow" x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#000" floodOpacity="0.65" />
        </filter>
        <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id="bodyClip">
          <path d={ROUNDED_BODY} />
        </clipPath>
      </defs>

      {/* the moon, rising behind the wall */}
      <circle cx="352" cy="20" r="34" fill="url(#moonGlow)" />
      <circle cx="352" cy="20" r="15" fill="url(#moonFace)" />
      <circle cx="347" cy="16" r="3" fill="#cfc7ae" opacity="0.5" />
      <circle cx="357" cy="25" r="2" fill="#cfc7ae" opacity="0.45" />

      <g filter="url(#castShadow)">
        {/* battlements along the top of the wall */}
        <path d={merlons(TURRETS.left + TURRET_W - 2, GATEHOUSE.x0 + 2, BODY.y0 + 2, 16, 17, 11) + merlons(GATEHOUSE.x1 - 2, TURRETS.right + 2, BODY.y0 + 2, 16, 17, 11)} fill="url(#stoneDark)" />

        {/* the wall: the body of the case */}
        <path d={ROUNDED_BODY} fill="url(#stone)" />

        {/* the gatehouse in the middle of the wall */}
        <path d={merlons(GATEHOUSE.x0, GATEHOUSE.x1, GATEHOUSE.y0 + 2, 12, 15, 9)} fill="url(#stoneDark)" />
        <rect x={GATEHOUSE.x0} y={GATEHOUSE.y0} width={GATEHOUSE.x1 - GATEHOUSE.x0} height={GATEHOUSE.y1 - GATEHOUSE.y0} rx="3" fill="url(#stone)" />

        {/* four round turrets: the corner bumpers */}
        <Turret x={TURRETS.left} top />
        <Turret x={TURRETS.right} top />
        <Turret x={TURRETS.left} />
        <Turret x={TURRETS.right} />
      </g>

      {/* masonry, grain and damp, inside the wall only */}
      <g clipPath="url(#bodyClip)">
        <rect width={CASE.w} height={CASE.h} fill="url(#ashlar)" />
        <rect width={CASE.w} height={CASE.h} fill="#000" filter="url(#stain)" />
        <rect width={CASE.w} height={CASE.h} fill="#000" filter="url(#grain)" opacity="0.6" />
        <rect width={CASE.w} height={CASE.h} fill="url(#moonlight)" />
      </g>
      <rect x={GATEHOUSE.x0} y={GATEHOUSE.y0} width={GATEHOUSE.x1 - GATEHOUSE.x0} height={GATEHOUSE.y1 - GATEHOUSE.y0} rx="3" fill="url(#ashlar)" />
      <path d={ROUNDED_BODY} fill="none" stroke="#000" strokeOpacity="0.7" strokeWidth="2" />
      <path d={`M${BODY.x0 + 40} ${BODY.y0 + 1.5}H${BODY.x1 - 40}`} stroke="#fff" strokeOpacity="0.16" strokeWidth="1.5" />

      {/* the gatehouse window: the castle's beacon */}
      <g className="castle__beacon">
        <ellipse cx="230" cy="32" rx="26" ry="20" className="castle__halo" filter="url(#glow)" />
        <path d="M220 46V30q0-9 10-14q10 5 10 14v16z" fill="#120f18" stroke="#0a080e" strokeWidth="2" />
        <path d="M222.5 45V30.5q0-7 7.5-11.3q7.5 4.3 7.5 11.3V45z" className="castle__lit" />
        <path d="M230 20v25M222.5 33h15" stroke="#120f18" strokeWidth="2" />
        <path d="M216 47h28" stroke="#6e6681" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d={`M${GATEHOUSE.x0 + 8} ${GATEHOUSE.y0 + 18}h6v18h-6zM${GATEHOUSE.x1 - 14} ${GATEHOUSE.y0 + 18}h6v18h-6z`} fill="#0d0b12" />

      {/* the screen's recess: black glass set into the stone */}
      <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={r + 5} fill="#030205" />
      <rect x={x - 5.5} y={y - 5.5} width={w + 11} height={h + 11} rx={r + 5.5} fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="1" />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="#0f0c18" />

      {/* the foundation: bigger blocks, and the carved panel for the nameplate */}
      <path d={`M${BODY.x0 + 30} ${y + h + 9}H${BODY.x1 - 30}`} stroke="#0d0b12" strokeOpacity="0.8" strokeWidth="2" />
      <rect x="140" y="828" width="180" height="34" rx="6" fill="#15121b" stroke="#000" strokeOpacity="0.8" />
      <rect x="141" y="829" width="178" height="32" rx="5" fill="none" stroke="#fff" strokeOpacity="0.06" />

      <Ivy />
      <Cobweb />
      <g className="castle__bats">
        <Bat x={112} y={12} s={1} />
        <Bat x={140} y={22} s={0.7} />
        <Bat x={318} y={8} s={0.6} />
      </g>
    </svg>
  );
}

/** A round corner turret. The top two rise above the wall with their own battlements; the bottom two are bastions. */
function Turret({ x, top = false }: { x: number; top?: boolean }) {
  const w = TURRET_W;
  const y0 = top ? TURRETS.top : TURRETS.bottom;
  const y1 = top ? TURRETS.top + TURRETS.topH : CASE.h - 4;
  const body = top
    ? `M${x} ${y0}H${x + w}V${y1 - 18}Q${x + w} ${y1} ${x + w / 2} ${y1}Q${x} ${y1} ${x} ${y1 - 18}Z`
    : `M${x} ${y0}H${x + w}V${y1 - 26}Q${x + w} ${y1} ${x + w / 2} ${y1}Q${x} ${y1} ${x} ${y1 - 26}Z`;
  const slitY = top ? y0 + 48 : y0 + 50;
  return (
    <g>
      {top ? <path d={merlons(x - 3, x + w + 3, y0 - 2, 13, 13, 8)} fill="url(#tower)" /> : null}
      <path d={body} fill="url(#tower)" />
      {/* the corbelled ring under the battlements */}
      <rect x={x - 3} y={y0 - 3} width={w + 6} height="9" rx="2" fill="url(#tower)" stroke="#000" strokeOpacity="0.5" />
      <path d={courses(x, y0 + 6, y1, w)} stroke="#0d0b12" strokeOpacity="0.75" strokeWidth="1.3" fill="none" />
      <path d={body} fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="1.5" />
      {/* a cross-shaped arrow slit, lit from inside */}
      <g className="castle__slit">
        <rect x={x + w / 2 - 9} y={slitY - 4} width="18" height="40" rx="5" className="castle__halo" filter="url(#glow)" />
        <path d={`M${x + w / 2 - 3} ${slitY}h6v11h5v5h-5v16h-6v-16h-5v-5h5z`} fill="#0b090f" />
        <path d={`M${x + w / 2 - 1.6} ${slitY + 1.5}h3.2v11h5v2h-5v15h-3.2v-15h-5v-2h5z`} className="castle__lit" />
      </g>
    </g>
  );
}

/** Ivy climbing from the bottom-left bastion up the side of the wall. */
function Ivy() {
  const leaves: [number, number, number, number][] = [
    [22, 700, -30, 1], [30, 662, 40, 0.9], [18, 620, -50, 0.8], [28, 586, 30, 0.75], [20, 548, -20, 0.65], [27, 512, 50, 0.55],
    [21, 478, -40, 0.5], [12, 742, 10, 1.1], [42, 760, 70, 1], [56, 812, 100, 0.95], [70, 840, 140, 0.9], [96, 852, 180, 0.8],
  ];
  return (
    <g className="castle__ivy">
      <path d="M8 868C20 820 36 790 24 740S18 660 28 610 16 540 24 470M24 760c18 10 34 40 40 70s30 24 46 30" stroke="#2c3a20" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {leaves.map(([lx, ly, rot, s], i) => (
        <g key={i} transform={`translate(${lx} ${ly}) rotate(${rot}) scale(${s})`}>
          <path d="M0 0c-6-3-10-9-8-14c3 1 5 0 6-3c2 3 4 4 7 3c1 6-2 11-5 14z" fill={i % 3 ? "#2f5a2a" : "#3d7034"} />
          <path d="M0 0l-1-12" stroke="#18301a" strokeWidth="0.8" />
        </g>
      ))}
    </g>
  );
}

/** A cobweb strung between the top-right turret and the wall. */
function Cobweb() {
  const cx = 398;
  const cy = 50;
  const spokes = [100, 125, 150, 175];
  const at = (deg: number, rr: number) => [cx + rr * Math.cos((deg * Math.PI) / 180), cy + rr * Math.sin((deg * Math.PI) / 180)] as const;
  let d = spokes.map((a) => `M${cx} ${cy}L${at(a, 34).join(" ")}`).join("");
  for (const rr of [10, 18, 26, 33]) {
    d += `M${at(spokes[0]!, rr).join(" ")}`;
    for (let i = 1; i < spokes.length; i++) d += `Q${at((spokes[i - 1]! + spokes[i]!) / 2, rr - 3).join(" ")} ${at(spokes[i]!, rr).join(" ")}`;
  }
  return <path d={d} stroke="#e8e2f5" strokeOpacity="0.35" strokeWidth="0.7" fill="none" />;
}

function Bat({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="castle__bat">
        <path d="M0 0c-3-4-8-5-12-3c2 1 3 3 2 5c-2-1-4-1-6 1c3 0 4 2 4 4c3-3 8-4 12-2c4-2 9-1 12 2c0-2 1-4 4-4c-2-2-4-2-6-1c-1-2 0-4 2-5c-4-2-9-1-12 3z" fill="#08060c" />
      </g>
    </g>
  );
}
