/**
 * Pure ghost-appearance generator. No DOM, no React, no CSS imports, so it can be unit tested with bun test.
 *
 * A ghost materialises at a random spot in the painted night on either side of the phone, drifts a short way over
 * its life, then thins away into mist. Two rules hold for every appearance, through the whole animation (the 0%
 * keyframe's small step back, the drift, the float bob, and the final stretch as it vanishes):
 *   - it never covers the phone (PHONE, plus a small margin), so it never sits over anything a person reads;
 *   - it stays inside the scene, so it is never cut off at the edge of the painting.
 * Ghosts always face the phone.
 */

/** The painted scene, in pixels. Mirrored in src/components/Scene.tsx. */
export const SCENE = { w: 1120, h: 920 };
/** The phone's frame in the scene. Mirrored in src/components/Scene.tsx. */
export const PHONE = { x: 354, y: 72, w: 412, h: 776 };
/** Height over width of the ghost silhouette (traced from the Ghost Army insignia). */
export const ASPECT = 223.6 / 201.7;

/** How far the animation can carry a ghost beyond its box (ghosts.css): */
export const MOTION = {
  /** .ghost__float bobs up and down this far. */
  bob: 6,
  /** The haunt keyframes start 10% of the drift back along the path. */
  lead: 0.1,
  /** ...and end scaled (1.06, 1.25) around the centre. */
  stretchX: 0.06,
  stretchY: 0.25,
  /** Space kept clear around the phone and inside the scene's edge. */
  margin: 8,
};

export interface Haunt {
  /** Changes every appearance so the CSS animation restarts. */
  n: number;
  x: number;
  y: number;
  /** How far it travels while visible. */
  dx: number;
  dy: number;
  /** Width in pixels. */
  size: number;
  /** Seconds from appearing to vanishing. */
  life: number;
  /** Mirrored, so it faces (and reaches) left, toward the phone. */
  faceLeft: boolean;
  /** Degrees: negative leans into a climb, positive into a dive. */
  tilt: number;
  alpha: number;
}

const rand = (a: number, b: number, rng: () => number) => a + rng() * (b - a);
const sign = (rng: () => number) => (rng() < 0.5 ? -1 : 1);

/**
 * The box a ghost can occupy at any moment of its animation, in scene pixels: the union of its start (stepped back
 * by `lead`) and end (drifted) positions, grown by the stretch and the bob. Exported for the tests.
 */
export function reach(h: Haunt): { x0: number; y0: number; x1: number; y1: number } {
  const height = h.size * ASPECT;
  const sx = (h.size * MOTION.stretchX) / 2;
  const sy = (height * MOTION.stretchY) / 2;
  const xs = [h.x - MOTION.lead * h.dx, h.x + h.dx];
  const ys = [h.y - MOTION.lead * h.dy, h.y + h.dy];
  return {
    x0: Math.min(...xs) - sx,
    x1: Math.max(...xs) + h.size + sx,
    y0: Math.min(...ys) - sy - MOTION.bob,
    y1: Math.max(...ys) + height + sy + MOTION.bob,
  };
}

/**
 * One random ghost appearance beside the phone: half the time on the left (where the mansion is), half on the right
 * (across the moon). Position and drift are chosen inside the allowed band, so `reach()` never touches the phone or
 * the scene's edge.
 */
export function haunt(n: number, rng: () => number = Math.random): Haunt {
  const left = rng() < 0.5;
  const life = rand(4.5, 8, rng);
  const alpha = rand(0.8, 0.95, rng);
  const size = rand(70, 120, rng);
  const height = size * ASPECT;
  const m = MOTION.margin;
  const sx = (size * MOTION.stretchX) / 2;
  const sy = (height * MOTION.stretchY) / 2;

  // Drift: mostly up or down along the phone, a little toward it.
  const dy = sign(rng) * rand(40, 110, rng);
  const dx = (left ? 1 : -1) * rand(0, 22, rng);

  // Horizontal band: the air between the scene's edge and the phone, minus everything the animation adds.
  const lead = MOTION.lead * Math.abs(dx);
  const xMin = left ? m + sx + lead : PHONE.x + PHONE.w + m + sx + Math.abs(dx);
  const xMax = left ? PHONE.x - m - sx - size - Math.abs(dx) : SCENE.w - m - sx - size - lead;
  // Vertical band: the scene's height, minus the drift (both ways), the bob and the stretch.
  const up = dy < 0 ? Math.abs(dy) : MOTION.lead * dy;
  const down = dy > 0 ? dy : MOTION.lead * Math.abs(dy);
  const yMin = m + sy + MOTION.bob + up;
  const yMax = SCENE.h - m - sy - MOTION.bob - height - down;

  return {
    n,
    x: rand(xMin, Math.max(xMin, xMax), rng),
    y: rand(yMin, Math.max(yMin, yMax), rng),
    dx,
    dy,
    size,
    life,
    faceLeft: !left,
    tilt: dy < 0 ? rand(-20, -6, rng) : rand(8, 24, rng),
    alpha,
  };
}
