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

/** A small seeded random, so the stars land in the same places every time the art is rebuilt. */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

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

function bat(x: number, y: number, s: number, delay: number) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="bat" style="animation-delay:${delay}s"><path d="M0 0c-3-4-8-5-12-3c2 1 3 3 2 5c-2-1-4-1-6 1c3 0 4 2 4 4c3-3 8-4 12-2c4-2 9-1 12 2c0-2 1-4 4-4c-2-2-4-2-6-1c-1-2 0-4 2-5c-4-2-9-1-12 3z" fill="#07050c"/></g></g>`;
}

/** Merlons along a wall top from x0 to x1 at height y. */
function merlons(x0: number, x1: number, y: number, w = 14, gap = 10, h = 12): string {
  let d = "";
  for (let x = x0; x + w <= x1; x += w + gap) d += `M${x} ${y}v${-h}h${w}v${h}z`;
  return d;
}

function banner(): string {
  const W = 1280;
  const H = 420;
  const rnd = seeded(31);
  const stars = Array.from({ length: 90 }, () => {
    const x = rnd() * W;
    const y = rnd() * 230;
    const r = 0.5 + rnd() * 1.3;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" class="star" style="animation-delay:${(-rnd() * 4).toFixed(2)}s"/>`;
  }).join("");

  // The castle: two tall towers with conical roofs, a keep with battlements, a gatehouse, curtain walls.
  const castle = [
    // curtain walls
    `M330 420V300h620v120z`,
    merlons(330, 950, 300),
    // left tower, roof and battlement ring
    `M352 420V196h72v224z`, `M344 198l44-78 44 78z`,
    // right tower
    `M858 420V176h72v244z`, `M850 178l44-84 44 84z`,
    // keep
    `M500 420V232h280v188z`, merlons(500, 780, 232, 18, 12, 16),
    // keep's central turret
    `M610 232V170h60v62z`, merlons(610, 670, 170, 12, 12, 12),
    // small towers at the wall ends
    `M300 420V262h40v158z`, merlons(300, 340, 262, 10, 5, 10),
    `M940 420V250h40v170z`, merlons(940, 980, 250, 10, 5, 10),
  ].join("");
  const windows = [
    [380, 240, 14, 26], [380, 300, 14, 26], [886, 220, 14, 26], [886, 290, 14, 26],
    [632, 190, 16, 26], [540, 262, 14, 24], [726, 262, 14, 24], [590, 300, 12, 20], [678, 300, 12, 20],
  ]
    .map(([x, y, w, h], i) => `<path class="win" style="animation-delay:${-i * 0.37}s" d="M${x} ${y! + h!}v${-h! + w! / 2}a${w! / 2} ${w! / 2} 0 0 1 ${w} 0v${h! - w! / 2}z"/>`)
    .join("");
  const gate = `<path d="M612 420v-58a28 28 0 0 1 56 0v58z" fill="#140e08"/><path d="M612 420v-58a28 28 0 0 1 56 0v58z" fill="none" stroke="#3a3148" stroke-width="3"/>
    ${[622, 634, 646, 658].map((x) => `<path d="M${x} 340v80" stroke="#2a2233" stroke-width="3"/>`).join("")}
    ${[366, 384, 402].map((y) => `<path d="M612 ${y}h56" stroke="#2a2233" stroke-width="3"/>`).join("")}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Trick or Read: a haunted castle under the moon, ghosts drifting around it">
  <defs>
    <style>
      @font-face { font-family: "Cinzel Decorative"; font-weight: 700; src: url(${CINZEL}) format("woff2"); }
      @font-face { font-family: "Atkinson Hyperlegible"; font-weight: 700; src: url(${ATKINSON}) format("woff2"); }
      .title { font: 700 88px "Cinzel Decorative", Georgia, serif; letter-spacing: 2px; }
      .sub { font: 700 22px "Atkinson Hyperlegible", "Helvetica Neue", Arial, sans-serif; fill: #d6cfea; letter-spacing: 0.3px; }
      .star { fill: #efeaff; animation: twinkle 4s ease-in-out infinite; }
      @keyframes twinkle { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.2; } }
      .win { fill: #ffa54d; filter: url(#warm); animation: candle 3.2s ease-in-out infinite; }
      @keyframes candle { 0%, 100% { opacity: 1; } 35% { opacity: 0.75; } 60% { opacity: 0.95; } 80% { opacity: 0.7; } }
      /* visible by default (and still, under reduced motion); the animation fades them in and out from there */
      .haunt { opacity: 0.9; transform-box: fill-box; animation: haunt 9s cubic-bezier(.45,.05,.4,1) infinite; }
      @keyframes haunt {
        0% { opacity: 0; transform: translate(0, 0) scale(0.8); }
        18% { opacity: 0.92; }
        62% { opacity: 0.92; }
        80%, 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.08, 1.2); }
      }
      .bob { animation: bob 2.8s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 70% 10%; }
      @keyframes bob { from { transform: translateY(-5px) rotate(-3deg); } to { transform: translateY(5px) rotate(3deg); } }
      .bat { animation: flap 1.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      @keyframes flap { 0%, 100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-4px) scaleY(0.5); } }
      .fog { animation: fog 26s ease-in-out infinite alternate; }
      .fog2 { animation: fog 34s ease-in-out infinite alternate-reverse; }
      @keyframes fog { from { transform: translateX(-60px); } to { transform: translateX(60px); } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
    </style>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#05040a"/>
      <stop offset="0.6" stop-color="#120d20"/>
      <stop offset="1" stop-color="#221636"/>
    </linearGradient>
    <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#efe8ff" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#efe8ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="moonFace" cx="0.4" cy="0.38" r="0.75">
      <stop offset="0" stop-color="#fffdf3"/>
      <stop offset="0.7" stop-color="#ebe4ce"/>
      <stop offset="1" stop-color="#b9b29c"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe9b3"/>
      <stop offset="0.5" stop-color="#e3b05a"/>
      <stop offset="1" stop-color="#9c6b22"/>
    </linearGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1524"/>
      <stop offset="1" stop-color="#0a0810"/>
    </linearGradient>
    <filter id="warm" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="titleShadow" x="-10%" y="-30%" width="120%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.9"/>
      <feDropShadow dx="0" dy="0" stdDeviation="14" flood-color="#ffa54d" flood-opacity="0.25"/>
    </filter>
    ${ghostSymbol}
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${stars}
  <circle cx="1170" cy="250" r="150" fill="url(#moonGlow)"/>
  <circle cx="1170" cy="250" r="50" fill="url(#moonFace)"/>
  <circle cx="1155" cy="239" r="8" fill="#d3cbb1" opacity="0.55"/>
  <circle cx="1183" cy="264" r="5.5" fill="#d3cbb1" opacity="0.5"/>
  <circle cx="1180" cy="229" r="3.5" fill="#d3cbb1" opacity="0.45"/>

  <!-- far hills -->
  <path d="M0 420V330c120-30 220-40 330-20s180 0 260-30 200-20 300 10 220 30 390 0V420z" fill="#0f0b18"/>

  <!-- the castle -->
  <!-- moonlight catches only the outer edge: the outline is drawn under the fill -->
  <path d="${castle}" fill="none" stroke="#51466e" stroke-width="3"/>
  <path d="${castle}" fill="url(#stone)"/>
  <path d="M352 196h72M858 176h72M500 232h280" stroke="#3a3150" stroke-width="2" opacity="0.7"/>
  ${windows}
  ${gate}

  <!-- fog rolling along the ground -->
  <g opacity="0.22" filter="url(#soft)">
    <ellipse class="fog" cx="300" cy="410" rx="380" ry="34" fill="#cfc6ff"/>
    <ellipse class="fog2" cx="980" cy="414" rx="420" ry="30" fill="#cfc6ff"/>
  </g>

  <!-- the name, carved in gold -->
  <text x="${W / 2}" y="118" text-anchor="middle" class="title" fill="url(#gold)" filter="url(#titleShadow)">Trick or Read</text>
  <text x="${W / 2}" y="160" text-anchor="middle" class="sub">A haunted castle that reads Halloween treats aloud, for blind and low-vision trick-or-treaters</text>

  <!-- ghosts -->
  ${ghost(0, 70, 200, 120, { tilt: -12, dx: 40, dy: -30, dur: 9, delay: 0 })}
  ${ghost(1, 1030, 200, 110, { flip: true, tilt: 10, dx: 40, dy: 20, dur: 10, delay: 3.2 })}
  ${ghost(2, 70, 30, 66, { tilt: 8, dx: 60, dy: 6, dur: 8, delay: 5.5 })}
  ${ghost(3, 980, 230, 80, { flip: true, tilt: -6, dx: 30, dy: -24, dur: 9.5, delay: 6.8 })}
  ${ghost(4, 450, 250, 64, { tilt: -16, dx: 30, dy: -40, dur: 8.5, delay: 1.8 })}
  ${ghost(5, 780, 200, 60, { flip: true, tilt: 14, dx: 40, dy: 10, dur: 11, delay: 4.4 })}

  ${bat(250, 222, 1.1, 0)}${bat(286, 236, 0.8, -0.4)}${bat(1110, 180, 0.9, -0.8)}${bat(1140, 196, 0.7, -0.2)}${bat(560, 196, 0.7, -0.6)}
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
