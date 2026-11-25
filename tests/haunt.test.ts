import { describe, expect, it } from "bun:test";
import { haunt, MOTION, PHONE, reach, SCENE } from "../src/lib/haunt";

/** A small seeded random source, so every run checks the same thousands of ghosts. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(1664525, s) + 1013904223) >>> 0) / 0x100000000);
}
const ghosts = (count: number, seed = 42) => {
  const rng = seeded(seed);
  return Array.from({ length: count }, (_, i) => haunt(i, rng));
};
/** Extreme random sources: always the lowest and always the highest draw. */
const extremes = [() => 0, () => 0.999999, () => 0.4999, () => 0.5];

describe("haunt()", () => {
  const sample = [...ghosts(4000), ...ghosts(4000, 7), ...extremes.map((r) => haunt(0, r))];

  it("never covers the phone, at any moment of the animation", () => {
    for (const h of sample) {
      const r = reach(h);
      const clear = r.x1 <= PHONE.x - MOTION.margin + 0.001 || r.x0 >= PHONE.x + PHONE.w + MOTION.margin - 0.001;
      expect(clear).toBe(true);
    }
  });

  it("stays inside the painted scene, at any moment of the animation", () => {
    for (const h of sample) {
      const r = reach(h);
      expect(r.x0).toBeGreaterThanOrEqual(0);
      expect(r.y0).toBeGreaterThanOrEqual(0);
      expect(r.x1).toBeLessThanOrEqual(SCENE.w);
      expect(r.y1).toBeLessThanOrEqual(SCENE.h);
    }
  });

  it("faces the phone and drifts toward it, never away", () => {
    for (const h of sample) {
      const leftSide = h.x + h.size / 2 < PHONE.x;
      expect(h.faceLeft).toBe(!leftSide);
      expect(Math.sign(h.dx) * (leftSide ? 1 : -1)).toBeGreaterThanOrEqual(0);
    }
  });

  it("uses both sides of the scene", () => {
    const left = sample.filter((h) => h.x < PHONE.x).length;
    expect(left / sample.length).toBeGreaterThan(0.4);
    expect(left / sample.length).toBeLessThan(0.6);
  });

  it("leans into the direction it travels", () => {
    for (const h of sample) expect(Math.sign(h.tilt)).toBe(h.dy < 0 ? -1 : 1);
  });
});
