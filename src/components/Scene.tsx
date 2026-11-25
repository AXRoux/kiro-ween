import type { ReactNode } from "react";
import type { Stage } from "./Arch";
import { Ghosts } from "./Ghosts";
import { LIGHTS } from "./sceneLights";
import sceneArt from "../assets/scene.webp";
import "../styles/scene.css";

/**
 * The costume: a painted Halloween night, and the app standing in its gate like a phone. On the left the haunted
 * mansion on its hill, lantern-lit stairs winding down; on the right the giant lavender moon with bats across it;
 * twisted trees strung with lights and hanging jack-o'-lanterns at both edges; stone pillars, iron fences, magenta
 * bushes and carved pumpkins along the bottom.
 *
 * The painting is one image (src/assets/scene.webp, generated for this app, see README). Everything that moves is
 * laid over it: every window, lantern and pumpkin flickers and every fairy light twinkles (sceneLights.ts), the moon
 * breathes, bats cross it, fog rolls along the ground, a violet moonlight washes the edges, and the ghosts haunt
 * the air around the phone. The pillar lantern and the lamp post burn in the verdict's colour.
 * All of it is aria-hidden and stops under prefers-reduced-motion; the screen inside says and shows everything.
 *
 * On a phone, or when there isn't room for the painting at 80% (a narrow or zoomed-in browser), the scene is left
 * off and the screen fills the page: the device is already the phone.
 */
export const SCENE = { w: 1120, h: 920 };
/** The phone's frame in the scene, and the screen inside it (392 x 752). Mirrored in scene.css. */
export const PHONE = { x: 354, y: 72, w: 412, h: 776 };
export const SCREEN = { x: 364, y: 84, w: 392, h: 752 };
const MOON = { x: 906, y: 239, r: 208 };
/** Lights that carry the verdict: the lantern on the left pillar and the lamp post on the right. */
const SIGNALS: [number, number][] = [[314, 484], [1054, 637]];
const isSignal = (x: number, y: number) => SIGNALS.some(([sx, sy]) => Math.hypot(sx - x, sy - y) < 30);

interface Props {
  children: ReactNode;
  stage: Stage;
  live: boolean;
  desktop: boolean;
  /** No painting: the screen fills the page. */
  bare: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

export function Scene({ children, stage, live, desktop, bare, onClose, onMinimize }: Props) {
  if (bare) return <div className="scene scene--bare">{children}</div>;
  return (
    <div className="scene" data-stage={live ? stage : "off"} style={{ width: SCENE.w, height: SCENE.h }}>
      <div className="scene__painting" aria-hidden="true">
        <img className="scene__art" src={sceneArt} alt="" width={SCENE.w} height={SCENE.h} draggable={false} />
        <div className="scene__moon" style={{ left: MOON.x - MOON.r * 1.6, top: MOON.y - MOON.r * 1.6, width: MOON.r * 3.2, height: MOON.r * 3.2 }} />
        <Bats />
        <div className="scene__lights">
          {LIGHTS.filter(([x, y]) => !isSignal(x, y)).map(([x, y, r, twinkle], i) => (
            <span
              key={i}
              className={twinkle ? "light light--twinkle" : "light"}
              style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, animationDelay: `${-((i * 0.37) % 3.1).toFixed(2)}s`, animationDuration: `${(twinkle ? 1.6 : 2.4) + ((i * 0.53) % 1.6)}s` }}
            />
          ))}
        </div>
        {/* the two lights that carry the verdict, in their own layer so their colour is not washed out */}
        <div className="scene__signals">
          {SIGNALS.map(([x, y]) => (
            <span key={x} className="signal" style={{ left: x - 60, top: y - 60 }} />
          ))}
        </div>
        <div className="scene__fog">
          <i />
          <i />
        </div>
        <div className="scene__violet" />
      </div>

      <Ghosts />

      <div className="phone" style={{ left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h }}>
        <span className="phone__key phone__key--action" aria-hidden="true" />
        <span className="phone__key phone__key--up" aria-hidden="true" />
        <span className="phone__key phone__key--down" aria-hidden="true" />
        <span className="phone__key phone__key--power" aria-hidden="true" />
        <div className="phone__screen">{children}</div>
      </div>

      {desktop ? (
        <div className="scene__controls">
          <button type="button" className="orb orb--close" onClick={onClose} aria-label="Close Trick or Read">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" />
            </svg>
          </button>
          <button type="button" className="orb" onClick={onMinimize} aria-label="Minimise Trick or Read">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5.5 10h9" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Bats crossing the moon, each on its own loop and flap. */
function Bats() {
  const bats = [
    { x: 760, y: 120, s: 1.4, dur: 14, delay: 0 },
    { x: 840, y: 330, s: 1.0, dur: 17, delay: -6 },
    { x: 700, y: 210, s: 0.8, dur: 12, delay: -3 },
    { x: 930, y: 60, s: 1.1, dur: 19, delay: -11 },
    { x: 980, y: 400, s: 0.7, dur: 15, delay: -8 },
  ];
  return (
    <svg className="scene__bats" viewBox={`0 0 ${SCENE.w} ${SCENE.h}`}>
      {bats.map((b, i) => (
        <g key={i} className="bat" style={{ animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}>
          <g transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
            <path
              className="bat__body"
              style={{ animationDelay: `${-i * 0.13}s` }}
              d="M0 0c-4-6-11-8-17-5c3 2 4 5 3 8c-3-2-6-2-9 1c4 0 6 3 5 6c5-4 11-5 18-3c7-2 13-1 18 3c-1-3 1-6 5-6c-3-3-6-3-9-1c-1-3 0-6 3-8c-6-3-13-1-17 5z"
            />
          </g>
        </g>
      ))}
    </svg>
  );
}
