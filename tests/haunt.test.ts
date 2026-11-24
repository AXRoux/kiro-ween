import { describe, expect, it } from "bun:test";
import { ASPECT, CASE, HALO, SCREEN, haunt } from "../src/lib/haunt";

/**
 * Build a simple seeded PRNG (LCG) so test runs are deterministic.
 * Returns values in [0, 1).
 */
function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Generate `count` haunts using the given PRNG, forcing the `where` value via a wrapper. */
function manyHaunts(count: number, seed = 42) {
  const rng = makePrng(seed);
  return Array.from({ length: count }, (_, i) => haunt(i, rng));
}

/** Generate haunts whose first random draw is forced into [0, 0.8) — side ghosts. */
function sideHaunts(count: number, seed = 1) {
  // Filter to side ghosts (where < 0.8) from a larger sample.
  return manyHaunts(count * 5, seed).filter((h) => h.size >= 62);
}

/** Generate haunts whose first random draw is forced into [0.8, 1) — sky ghosts. */
function skyHaunts(count: number, seed = 1) {
  return manyHaunts(count * 5, seed).filter((h) => h.size < 62);
}

// ---------------------------------------------------------------------------
// Helpers

/** Right edge of the screen. */
const SCREEN_RIGHT = SCREEN.x + SCREEN.w;

/**
 * Returns true if the ghost's bounding box at a given position overlaps the screen rectangle.
 * The ghost occupies [gx, gx+size] × [gy, gy+size*ASPECT].
 */
function coversScreen(gx: number, gy: number, size: number): boolean {
  const gx1 = gx + size;
  const gy1 = gy + size * ASPECT;
  // Axis-aligned rectangle intersection
  return gx < SCREEN_RIGHT && gx1 > SCREEN.x && gy < SCREEN.y + SCREEN.h && gy1 > SCREEN.y;
}

/**
 * Returns true if the ghost's bounding box lies within the halo window for a side ghost.
 * Sky ghosts are allowed to materialise up to 6 px above the halo top edge (intentional design:
 * they appear to drift in from just above the castle, so rand(-HALO.top - 6, -4) is correct).
 *
 * Side ghost halo bounds (at start position):
 *   x ∈ [-HALO.x, CASE.w + HALO.x]  (right edge of ghost)
 *   y ∈ [-HALO.top, CASE.h + HALO.bottom]  (bottom edge of ghost)
 */
function withinHaloSide(gx: number, gy: number, size: number): boolean {
  const minX = -HALO.x;
  const maxX = CASE.w + HALO.x;
  const minY = -HALO.top;
  const maxY = CASE.h + HALO.bottom;
  return gx >= minX && gx + size <= maxX && gy >= minY && gy + size * ASPECT <= maxY;
}

// ---------------------------------------------------------------------------

describe("haunt()", () => {
  it("screen is never covered at the start position", () => {
    const ghosts = manyHaunts(2000);
    for (const h of ghosts) {
      expect(coversScreen(h.x, h.y, h.size)).toBe(false);
    }
  });

  it("screen is never covered at the end position (after drift)", () => {
    const ghosts = manyHaunts(2000);
    for (const h of ghosts) {
      expect(coversScreen(h.x + h.dx, h.y + h.dy, h.size)).toBe(false);
    }
  });

  it("side ghosts stay inside the halo window at the start position", () => {
    const sides = sideHaunts(400);
    for (const h of sides) {
      expect(withinHaloSide(h.x, h.y, h.size)).toBe(true);
    }
  });

  it("side ghosts face the castle (faceLeft matches which side they are on)", () => {
    // A side ghost on the left (x + size < SCREEN.x roughly) should face right, i.e. faceLeft = false.
    // A side ghost on the right (x > SCREEN_RIGHT roughly) should face left, i.e. faceLeft = true.
    const sides = sideHaunts(400);
    for (const h of sides) {
      const isLeft = h.x + h.size < CASE.w / 2;
      if (isLeft) {
        // Left-side ghost reaches toward the castle: faceLeft = false (faces right).
        expect(h.faceLeft).toBe(false);
      } else {
        // Right-side ghost reaches toward the castle: faceLeft = true (faces left).
        expect(h.faceLeft).toBe(true);
      }
    }
  });

  it("sky ghosts are smaller than side ghosts", () => {
    const sky = skyHaunts(200);
    const side = sideHaunts(200);
    expect(sky.length).toBeGreaterThan(0);
    expect(side.length).toBeGreaterThan(0);
    const maxSky = Math.max(...sky.map((h) => h.size));
    const minSide = Math.min(...side.map((h) => h.size));
    expect(maxSky).toBeLessThan(minSide);
  });

  it("sky ghosts appear above the battlements (y < 0)", () => {
    const sky = skyHaunts(200);
    for (const h of sky) {
      expect(h.y).toBeLessThan(0);
    }
  });

  it("side ghosts appear in the vertical range of the castle body", () => {
    const sides = sideHaunts(400);
    for (const h of sides) {
      expect(h.y).toBeGreaterThanOrEqual(0);
      expect(h.y + h.size * ASPECT).toBeLessThanOrEqual(CASE.h);
    }
  });
});
