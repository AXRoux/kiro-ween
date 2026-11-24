/**
 * Pure ghost-appearance generator. No DOM, no React, no CSS imports — safe to unit-test with bun test.
 *
 * A ghost materialises at a random position in the haunted air outside the castle, drifts a short distance
 * over its life, then fades to mist. The position and drift are chosen so the ghost never covers the screen
 * rectangle even at the end of its flight, while still being allowed to overlap the stone of the turrets.
 */

/** Case dimensions, in pixels. */
export const CASE = { w: 460, h: 880 };
/** The screen rectangle inside the case. */
export const SCREEN = { x: 34, y: 62, w: 392, h: 752 };
/** Haunted air outside the case: 110 px each side, 32 px sky strip above, 8 px below. */
export const HALO = { x: 110, top: 32, bottom: 8 };
/** Height ÷ width of the ghost silhouette (traced from the Ghost Army insignia). */
export const ASPECT = 223.6 / 201.7;

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
  /** Mirrored, so it faces (and reaches) toward the castle. */
  faceLeft: boolean;
  /** Degrees: negative leans into a climb, positive into a dive. */
  tilt: number;
  alpha: number;
}

/** Generate a random float in [a, b). */
const rand = (a: number, b: number, rng: () => number) => a + rng() * (b - a);
/** Random sign. */
const sign = (rng: () => number) => (rng() < 0.5 ? -1 : 1);

/**
 * Generate one random ghost appearance outside the castle walls.
 *
 * @param n     - Sequence number passed through to `Haunt.n` so the caller can key animations.
 * @param rng   - Random source; defaults to `Math.random`. Pass a seeded or scripted function for tests.
 *
 * Position rule: a ghost may overlap the stone of the case (turrets), but must never cover the screen
 * (`SCREEN` rectangle). The check is applied at both the start position and the end position
 * (start + dx, start + dy), so the drift does not cause a late overlap.
 *
 * The ghost also stays inside the halo window:
 *   x ∈ [-HALO.x, CASE.w + HALO.x - size]
 *   y ∈ [-HALO.top, CASE.h + HALO.bottom - size * ASPECT]
 */
export function haunt(n: number, rng: () => number = Math.random): Haunt {
  const where = rng();
  const life = rand(4, 7, rng);
  const alpha = rand(0.78, 0.95, rng);

  if (where < 0.8) {
    const left = where < 0.4;
    const size = rand(62, 100, rng);
    const h = size * ASPECT;

    const dy = sign(rng) * rand(50, 120, rng);
    const y = dy < 0 ? rand(140, CASE.h - h - 10, rng) : rand(10, CASE.h - h - 140, rng);
    // Drift toward the castle: left ghosts move right (dx > 0), right ghosts move left (dx < 0).
    const dx = (left ? 1 : -1) * rand(0, 16, rng);

    let x: number;
    if (left) {
      // Raw range: (-HALO.x + 2) to (-size * 0.58).
      // Rule: right edge at end (x + dx + size) must not enter the screen.
      //   x + dx + size <= SCREEN.x  =>  x <= SCREEN.x - dx - size
      x = rand(-HALO.x + 2, -size * 0.58, rng);
      x = Math.min(x, SCREEN.x - dx - size);
    } else {
      // Raw range: (CASE.w - size * 0.42) to (CASE.w + HALO.x - size - 2).
      // Rule: left edge at end (x + dx) must not enter the screen from the right.
      //   x + dx >= SCREEN.x + SCREEN.w  =>  x >= SCREEN.x + SCREEN.w - dx
      // (dx is negative here, so -dx is positive, raising the floor.)
      x = rand(CASE.w - size * 0.42, CASE.w + HALO.x - size - 2, rng);
      x = Math.max(x, SCREEN.x + SCREEN.w - dx);
    }

    return {
      n,
      x,
      y,
      dx,
      dy,
      size,
      life,
      faceLeft: !left,
      tilt: dy < 0 ? rand(-22, -8, rng) : rand(10, 26, rng),
      alpha,
    };
  }

  // Sky strip above the battlements: smaller ghosts swooping sideways past the gatehouse.
  const size = rand(40, 54, rng);
  const dx = sign(rng) * rand(50, 110, rng);
  const x = dx > 0 ? rand(40, CASE.w / 2, rng) : rand(CASE.w / 2, CASE.w - 40 - size, rng);
  return {
    n,
    x,
    y: rand(-HALO.top - 6, -4, rng),
    dx,
    dy: rand(-8, 8, rng),
    size,
    life,
    faceLeft: dx < 0,
    tilt: rand(4, 14, rng),
    alpha,
  };
}
