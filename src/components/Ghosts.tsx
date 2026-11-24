import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CASE, HALO, haunt, type Haunt } from "../lib/haunt";
import { GHOST_BODY, GHOST_EYES, GHOST_VIEWBOX } from "./ghostShape";
import "../styles/ghosts.css";

/**
 * Ghosts haunting the castle from outside: in the air to its left and right and in the sky over the battlements. Each
 * one materialises at a random spot, swoops a little way along the walls (leaning into the climb, or diving), and
 * thins away into mist; a moment later it appears somewhere else. Ghosts at the sides always reach toward the castle.
 * Their glow takes the verdict's colour, so they blush red on a Beware.
 *
 * Pure costume: aria-hidden, they never take a click (the desktop window lets clicks through them to the desktop
 * beneath), and they are not drawn at all under prefers-reduced-motion. Positions are in the case's own pixels,
 * relative to its top-left corner, so negative x is the air to the left of the castle.
 */
const COUNT = 4;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function Ghosts() {
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  if (reduced) return null;
  return (
    <div className="ghosts" aria-hidden="true">
      {/* the shape and its fade, defined once and used by every ghost */}
      <svg width="0" height="0" className="ghosts__defs">
        <defs>
          {/* solid at the head, thinning toward the tattered hem */}
          <linearGradient id="ghostFade" x1="0.8" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#f6f3ff" stopOpacity="0.96" />
            <stop offset="1" stopColor="#e4ddff" stopOpacity="0.25" />
          </linearGradient>
          <symbol id="ghost" viewBox={GHOST_VIEWBOX}>
            <path d={GHOST_BODY} fill="url(#ghostFade)" />
            {GHOST_EYES.map((d) => (
              <path key={d} d={d} fill="#120e1a" />
            ))}
          </symbol>
        </defs>
      </svg>
      {Array.from({ length: COUNT }, (_, i) => (
        <Ghost key={i} first={i * 1.6 + rand(0.3, 1.1)} />
      ))}
    </div>
  );
}

/**
 * The desktop app's ghost window: transparent, never takes the mouse, sized to the castle plus HALO and kept centred
 * on it by the main process. The ghosts are laid out exactly as they would be around the castle in a browser.
 */
export function GhostsWindow() {
  const [verdict, setVerdict] = useState("none");
  useEffect(() => {
    document.documentElement.classList.add("ghost-window");
    window.castle?.onVerdict(setVerdict);
  }, []);
  return (
    <div className="ghost-window__castle" data-verdict={verdict} style={{ left: HALO.x, top: HALO.top, width: CASE.w, height: CASE.h }}>
      <Ghosts />
    </div>
  );
}

/** One ghost: materialises, swoops, vanishes, waits, and appears again somewhere else. */
function Ghost({ first }: { first: number }) {
  const [h, setH] = useState<Haunt | null>(null);
  const timer = useRef(0);
  const count = useRef(0);
  useEffect(() => {
    timer.current = window.setTimeout(() => setH(haunt(0)), first * 1000);
    return () => clearTimeout(timer.current);
  }, [first]);

  const vanish = () => {
    setH(null);
    timer.current = window.setTimeout(() => setH(haunt(++count.current)), rand(700, 4000));
  };

  if (!h) return null;
  return (
    <div
      key={h.n}
      className="ghost"
      onAnimationEnd={(e) => e.animationName === "haunt" && vanish()}
      style={{ left: h.x, top: h.y, width: h.size, "--dx": `${h.dx}px`, "--dy": `${h.dy}px`, "--life": `${h.life}s`, "--alpha": h.alpha } as CSSProperties}
    >
      <div className="ghost__pose" style={{ transform: `${h.faceLeft ? "scaleX(-1) " : ""}rotate(${h.tilt}deg)` }}>
        <div className="ghost__float" style={{ animationDuration: `${rand(2.2, 3.2)}s`, animationDelay: `${-rand(0, 3)}s` }}>
          <svg className="ghost__body" viewBox={GHOST_VIEWBOX}>
            <use href="#ghost" />
          </svg>
        </div>
      </div>
    </div>
  );
}
