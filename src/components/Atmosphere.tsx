import { useEffect, useMemo, useRef } from "react";
import "../styles/atmosphere.css";

/**
 * The night around the séance: moon, fog, two gnarled trees, embers and the odd bat.
 * Pure atmosphere, so it is hidden from screen readers and stops moving under prefers-reduced-motion.
 */
export function Atmosphere() {
  return (
    <div className="atmos" aria-hidden="true">
      <div className="atmos__sky" />
      <div className="atmos__moon" />
      <div className="atmos__stars" />
      <Embers />
      <svg className="atmos__tree atmos__tree--left" viewBox="0 0 600 700" preserveAspectRatio="xMinYMax meet">
        <Tree seed={7} x={150} />
      </svg>
      <svg className="atmos__tree atmos__tree--right" viewBox="0 0 600 700" preserveAspectRatio="xMaxYMax meet">
        <Tree seed={23} x={430} />
      </svg>
      <div className="atmos__fog atmos__fog--back" />
      <div className="atmos__fog atmos__fog--front" />
      <Bat className="atmos__bat atmos__bat--1" />
      <Bat className="atmos__bat atmos__bat--2" />
      <div className="atmos__vignette" />
    </div>
  );
}

/** A deterministic random generator, so the trees are the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A gnarled tree, grown by recursive branching with tapering, curved limbs. */
function Tree({ seed, x }: { seed: number; x: number }) {
  const paths = useMemo(() => {
    const rand = rng(seed);
    const out: { d: string; w: number }[] = [];
    const grow = (x0: number, y0: number, angle: number, len: number, width: number, depth: number) => {
      const bend = (rand() - 0.5) * 0.9;
      const x1 = x0 + Math.cos(angle) * len;
      const y1 = y0 + Math.sin(angle) * len;
      const cx = x0 + Math.cos(angle + bend) * len * 0.55;
      const cy = y0 + Math.sin(angle + bend) * len * 0.55;
      out.push({ d: `M${x0.toFixed(1)} ${y0.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`, w: width });
      if (depth === 0 || width < 0.7) return;
      const n = depth > 5 ? 2 : 2 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        const spread = (i / Math.max(1, n - 1) - 0.5) * (0.9 + rand() * 0.7);
        grow(x1, y1, angle + spread + (rand() - 0.5) * 0.4, len * (0.66 + rand() * 0.16), width * 0.64, depth - 1);
      }
    };
    grow(x, 700, -Math.PI / 2 + (rand() - 0.5) * 0.15, 150, 30, 8);
    return out;
  }, [seed, x]);
  return (
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      {paths.map((p, i) => (
        <path key={i} d={p.d} strokeWidth={p.w} />
      ))}
    </g>
  );
}

function Bat({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 50">
      <g className="atmos__bat-body" fill="currentColor">
        <path className="atmos__wing atmos__wing--l" d="M60 26C48 10 30 6 6 14c10 3 14 9 15 16 6-5 12-4 17 1 4-6 12-7 22-5z" />
        <path className="atmos__wing atmos__wing--r" d="M60 26c12-16 30-20 54-12-10 3-14 9-15 16-6-5-12-4-17 1-4-6-12-7-22-5z" />
        <ellipse cx="60" cy="27" rx="6" ry="8" />
        <path d="M55 20l2-6 3 4 3-4 2 6z" />
      </g>
    </svg>
  );
}

/** Embers drifting up from the candles: a light canvas loop, off under reduced motion. */
function Embers() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const resize = () => {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
    };
    resize();
    addEventListener("resize", resize);
    const rand = rng(99);
    const motes = Array.from({ length: 46 }, () => ({ x: rand(), y: rand(), r: 0.6 + rand() * 1.8, v: 0.00012 + rand() * 0.00035, sway: rand() * Math.PI * 2, hue: rand() }));
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of motes) {
        m.y -= m.v * dt;
        m.sway += dt * 0.0012;
        if (m.y < -0.02) {
          m.y = 1.02;
          m.x = rand();
        }
        const px = (m.x + Math.sin(m.sway) * 0.012) * canvas.width;
        const py = m.y * canvas.height;
        const fade = Math.min(1, m.y * 1.6) * (0.5 + 0.5 * Math.sin(m.sway * 1.7));
        const g = ctx.createRadialGradient(px, py, 0, px, py, m.r * 4 * dpr);
        const color = m.hue > 0.75 ? "141,255,181" : "255,190,110";
        g.addColorStop(0, `rgba(${color},${0.75 * fade})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, m.r * 4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="atmos__embers" />;
}
