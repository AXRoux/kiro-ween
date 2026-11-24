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

/**
 * Returns true if the sky ghost's top edge is inside the halo at the start position (0% keyframe),
 * accounting for the haunt keyframe translate(-0.1*dx, -0.1*dy) offset and the ±6 px float bob.
 *
 *   Start top: gy + (-0.1 * ghostDy) - 6 >= -HALO.top
 *
 * The -0.1*dy term: at 0% the ghost is nudged up by 0.1*dy when dy is positive (the ghost condenses
 * from slightly behind its flight path), making the top edge higher than gy - 6 alone.
 */
function skyTopOkAtStart(gy: number, ghostDy: number): boolean {
  return gy - 0.1 * ghostDy - 6 >= -HALO.top;
}

/**
 * Returns true if the sky ghost's top edge is inside the halo at the end position (100% keyframe),
 * accounting for drift, the scale(1.06, 1.25) that raises the top by 0.125*size*ASPECT, and the
 * ±6 px float bob.
 *
 *   End top: gy + dy - 6 - 0.125 * size * ASPECT >= -HALO.top
 *
 * The 0.125*size*ASPECT term: scaling height by 1.25 around the centre raises the top edge by
 * 0.5 * (1.25 - 1) * height = 0.125 * size * ASPECT.
 */
function skyTopOkAtEnd(gy: number, dy: number, size: number): boolean {
  return gy + dy - 6 - 0.125 * size * ASPECT >= -HALO.top;
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

  it("sky ghosts stay inside the halo window at the start position, including the 6 px float bob", () => {
    const sky = skyHaunts(200);
    for (const h of sky) {
      expect(skyTopOkAtStart(h.y, h.dy)).toBe(true);
    }
  });

  it("sky ghosts stay inside the halo window at the end position (after drift), including the 6 px float bob", () => {
    const sky = skyHaunts(200);
    for (const h of sky) {
      expect(skyTopOkAtEnd(h.y, h.dy, h.size)).toBe(true);
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
