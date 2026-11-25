/**
 * Draws the README's art: docs/banner.svg (the castle under the moon, haunted by ghosts) and docs/divider.svg.
 * Both are self-contained animated SVGs (fonts embedded as data URLs), because GitHub shows README images through
 * <img>, which loads nothing external but does run the SVG's own CSS animations.
 *
 *   bun run scripts/readme-art.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { GHOST_BODY, GHOST_EYES, GHOST_VIEWBOX } from "../src/components/ghostShape";

const font = (file: string) => `data:font/woff2;base64,${readFileSync(`node_modules/@fontsource/${file}`).toString("base64")}`;
const CINZEL = font("cinzel-decorative/files/cinzel-decorative-latin-700-normal.woff2");
const ATKINSON = font("atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2");


const ghostSymbol = `
    <linearGradient id="ghostFade" x1="0.8" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.55" stop-color="#f6f3ff" stop-opacity="0.96"/>
      <stop offset="1" stop-color="#e4ddff" stop-opacity="0.2"/>
    </linearGradient>
    <filter id="ghostGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="b"/>
      <feFlood flood-color="#c4b5ff" flood-opacity="0.55"/>
      <feComposite in2="b" operator="in" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <symbol id="ghost" viewBox="${GHOST_VIEWBOX}">
      <path d="${GHOST_BODY}" fill="url(#ghostFade)"/>
      ${GHOST_EYES.map((d) => `<path d="${d}" fill="#120e1a"/>`).join("")}
    </symbol>`;

/** A ghost that materialises, swoops a little way, and thins away, over and over. */
function ghost(i: number, x: number, y: number, w: number, { flip = false, tilt = 0, dx = 30, dy = -20, dur = 9, delay = 0 } = {}) {
  const h = w * (223.6 / 201.7);
  return `
  <g transform="translate(${x} ${y}) rotate(${tilt}) ${flip ? `scale(-1 1) translate(${-w} 0)` : ""}">
    <g class="haunt" style="--dx:${flip ? -dx : dx}px;--dy:${dy}px;animation-duration:${dur}s;animation-delay:${-delay}s">
      <g class="bob" style="animation-delay:${-i * 0.7}s">
        <use href="#ghost" width="${w}" height="${h.toFixed(1)}" filter="url(#ghostGlow)"/>
      </g>
    </g>
  </g>`;
}



function banner(): string {
  const W = 1280;
  const H = 420;
  // The painted night from the app (src/assets/scene.webp), cut to a band through the mansion and the moon.
  const art = `data:image/webp;base64,${readFileSync("docs/banner-bg.webp").toString("base64")}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Trick or Read: a painted Halloween night, the haunted mansion and the moon, with ghosts drifting through">
  <defs>
    <style>
      @font-face { font-family: "Cinzel Decorative"; font-weight: 700; src: url(${CINZEL}) format("woff2"); }
      @font-face { font-family: "Atkinson Hyperlegible"; font-weight: 700; src: url(${ATKINSON}) format("woff2"); }
      .title { font: 700 88px "Cinzel Decorative", Georgia, serif; letter-spacing: 2px; }
      .sub { font: 700 22px "Atkinson Hyperlegible", "Helvetica Neue", Arial, sans-serif; fill: #f2eeff; letter-spacing: 0.3px; }
      .haunt { opacity: 0.9; transform-box: fill-box; animation: haunt 9s cubic-bezier(.45,.05,.4,1) infinite; }
      @keyframes haunt {
        0% { opacity: 0; transform: translate(0, 0) scale(0.8); }
        18% { opacity: 0.92; }
        62% { opacity: 0.92; }
        80%, 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.08, 1.2); }
      }
      .bob { animation: bob 2.8s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 70% 10%; }
      @keyframes bob { from { transform: translateY(-5px) rotate(-3deg); } to { transform: translateY(5px) rotate(3deg); } }
      .moonglow { animation: breathe 7s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      @keyframes breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.95; } }
      .fog { animation: fog 26s ease-in-out infinite alternate; }
      .fog2 { animation: fog 34s ease-in-out infinite alternate-reverse; }
      @keyframes fog { from { transform: translateX(-60px); } to { transform: translateX(60px); } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
    </style>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe9b3"/>
      <stop offset="0.5" stop-color="#e3b05a"/>
      <stop offset="1" stop-color="#9c6b22"/>
    </linearGradient>
    <radialGradient id="hush" cx="0.5" cy="0.36" r="0.5">
      <stop offset="0" stop-color="#0b0716" stop-opacity="0.72"/>
      <stop offset="0.6" stop-color="#0b0716" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#0b0716" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="moonHalo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#e6efff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#c9b8ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8b6cff" stop-opacity="0.18"/>
      <stop offset="0.5" stop-color="#8b6cff" stop-opacity="0"/>
      <stop offset="1" stop-color="#ff5fa2" stop-opacity="0.12"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="titleShadow" x="-10%" y="-30%" width="120%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.9"/>
      <feDropShadow dx="0" dy="0" stdDeviation="16" flood-color="#ffa54d" flood-opacity="0.3"/>
    </filter>
    ${ghostSymbol}
  </defs>

  <image href="${art}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
  <ellipse class="moonglow" cx="1035" cy="150" rx="260" ry="240" fill="url(#moonHalo)"/>
  <rect width="${W}" height="${H}" fill="url(#edge)"/>
  <ellipse cx="${W / 2}" cy="140" rx="620" ry="170" fill="url(#hush)"/>

  <g opacity="0.2" filter="url(#soft)">
    <ellipse class="fog" cx="300" cy="410" rx="380" ry="34" fill="#cfc6ff"/>
    <ellipse class="fog2" cx="980" cy="414" rx="420" ry="30" fill="#cfc6ff"/>
  </g>

  <text x="${W / 2}" y="118" text-anchor="middle" class="title" fill="url(#gold)" filter="url(#titleShadow)">Trick or Read</text>
  <text x="${W / 2}" y="160" text-anchor="middle" class="sub" filter="url(#titleShadow)">A haunted castle that reads Halloween treats aloud, for blind and low-vision trick-or-treaters</text>

  ${ghost(0, 330, 200, 110, { tilt: -12, dx: 40, dy: -30, dur: 9, delay: 0 })}
  ${ghost(1, 1110, 230, 100, { flip: true, tilt: 10, dx: 40, dy: 20, dur: 10, delay: 3.2 })}
  ${ghost(2, 40, 210, 80, { tilt: 8, dx: 50, dy: -16, dur: 8, delay: 5.5 })}
  ${ghost(3, 920, 220, 76, { flip: true, tilt: -6, dx: 30, dy: -24, dur: 9.5, delay: 6.8 })}
  ${ghost(4, 560, 250, 64, { tilt: -16, dx: 30, dy: -30, dur: 8.5, delay: 1.8 })}
</svg>
`;
}

function divider(): string {
  const W = 880;
  const H = 56;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="">
  <defs>
    <style>
      .bob { animation: bob 2.6s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 70% 10%; }
      @keyframes bob { from { transform: translateY(-3px) rotate(-4deg); } to { transform: translateY(3px) rotate(4deg); } }
      .flame { animation: candle 2.8s ease-in-out infinite; }
      @keyframes candle { 0%, 100% { opacity: 1; } 40% { opacity: 0.7; } 70% { opacity: 0.9; } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
    </style>
    <linearGradient id="lineL" x1="0" x2="1"><stop offset="0" stop-color="#8a7fb0" stop-opacity="0"/><stop offset="1" stop-color="#8a7fb0" stop-opacity="0.8"/></linearGradient>
    <linearGradient id="lineR" x1="1" x2="0"><stop offset="0" stop-color="#8a7fb0" stop-opacity="0"/><stop offset="1" stop-color="#8a7fb0" stop-opacity="0.8"/></linearGradient>
    ${ghostSymbol}
  </defs>
  <path d="M40 30H372" stroke="url(#lineL)" stroke-width="1.5"/>
  <path d="M508 30H840" stroke="url(#lineR)" stroke-width="1.5"/>
  ${[388, 492].map((x) => `<g transform="translate(${x - 10} 20)"><ellipse cx="10" cy="11" rx="10" ry="8.5" fill="#ff8a2a"/><path d="M4 5c-2 3-2 9 1 12M16 5c2 3 2 9-1 12M10 3v16" stroke="#c9631c" stroke-width="1.2" fill="none"/><path d="M10 3.5c0-2 1-3 2.5-3.5" stroke="#4a6a2a" stroke-width="1.6" fill="none"/><path class="flame" d="M5 9l2.5-2 1.5 2.5zM15 9l-2.5-2-1.5 2.5zM5.5 13c2 2.5 7 2.5 9 0l-1.5 1.5-1.5-1-1.5 1.2-1.5-1.2-1.5 1z" fill="#ffd27a"/></g>`).join("")}
  <g transform="translate(422 4)"><g class="bob"><use href="#ghost" width="40" height="44" filter="url(#ghostGlow)"/></g></g>
</svg>
`;
}

mkdirSync("docs", { recursive: true });
writeFileSync("docs/banner.svg", banner());
writeFileSync("docs/divider.svg", divider());
console.log("wrote docs/banner.svg and docs/divider.svg");

/** The app icon (build/icon.svg, rendered to build/icon.png at 1024 px for electron-builder). */
function icon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0816"/><stop offset="1" stop-color="#2a1b42"/></linearGradient>
    <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#efe8ff" stop-opacity="0.5"/><stop offset="1" stop-color="#efe8ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="moonFace" cx="0.4" cy="0.38" r="0.75"><stop offset="0" stop-color="#fffdf3"/><stop offset="1" stop-color="#cfc8b0"/></radialGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d3552"/><stop offset="1" stop-color="#16121f"/></linearGradient>
    <filter id="warm" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    ${ghostSymbol}
    <clipPath id="tile"><rect x="64" y="64" width="896" height="896" rx="200"/></clipPath>
  </defs>
  <g clip-path="url(#tile)">
    <rect x="64" y="64" width="896" height="896" fill="url(#sky)"/>
    <circle cx="740" cy="270" r="230" fill="url(#moonGlow)"/>
    <circle cx="740" cy="270" r="110" fill="url(#moonFace)"/>
    <path d="M64 960V760h120v-60h40v-40h40v40h40v60h80V560h-30l80-130 80 130h-30v200h80v-60h40v-40h40v40h40v60h120V960z" fill="url(#stone)"/>
    <path d="M482 960V860a30 30 0 0 1 60 0v100z" fill="#120c08"/>
    <path d="M498 640v-46a14 14 0 0 1 28 0v46z" fill="#ffa54d" filter="url(#warm)"/>
    <path d="M150 840v-36a12 12 0 0 1 24 0v36zM850 840v-36a12 12 0 0 1 24 0v36z" fill="#ffa54d" filter="url(#warm)"/>
    <use href="#ghost" x="150" y="170" width="430" height="477" filter="url(#ghostGlow)" transform="rotate(-8 365 408)"/>
  </g>
</svg>
`;
}
writeFileSync("build/icon.svg", icon());
console.log("wrote build/icon.svg");
