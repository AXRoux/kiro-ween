import { describe, expect, it } from "bun:test";
import { H, STILL_MS, Stillness, W } from "../src/lib/motion";

const frame = (fill: number, patch?: { value: number; size: number; at?: number }) => {
  const f = new Float32Array(W * H).fill(fill);
  if (patch) for (let y = 0; y < patch.size; y++) for (let x = 0; x < patch.size; x++) f[(y + 10) * W + x + (patch.at ?? 20)] = patch.value;
  return f;
};

/** Feeds frames 100 ms apart and returns how many times the mirror fired. */
function run(s: Stillness, frames: Float32Array[], start = 0) {
  let fired = 0;
  frames.forEach((f, i) => (fired += s.feed(f, start + i * 100).fire ? 1 : 0));
  return fired;
}

describe("stillness", () => {
  it("reads once when something appears and holds still", () => {
    const s = new Stillness();
    const empty = frame(120);
    const candy = frame(120, { value: 250, size: 26 });
    const held = Array.from({ length: STILL_MS / 100 + 3 }, () => candy);
    expect(run(s, [empty, empty, candy, ...held])).toBe(1);
  });
  it("does not read the same still scene twice", () => {
    const s = new Stillness();
    const empty = frame(120);
    const candy = frame(120, { value: 250, size: 26 });
    const held = Array.from({ length: 30 }, () => candy);
    expect(run(s, [empty, candy, ...held, ...held])).toBe(1);
  });
  it("reads again when a different candy is held up", () => {
    const s = new Stillness();
    const empty = frame(120);
    const a = frame(120, { value: 250, size: 26 });
    const b = frame(120, { value: 10, size: 26, at: 30 });
    const hold = (f: Float32Array) => Array.from({ length: 12 }, () => f);
    expect(run(s, [empty, a, ...hold(a), empty, b, ...hold(b)])).toBe(2);
  });
  it("never reads in the dark", () => {
    const s = new Stillness();
    const dark = frame(10);
    expect(s.feed(dark, 0).phase).toBe("dark");
    expect(run(s, Array.from({ length: 20 }, () => dark))).toBe(0);
  });
  it("does not read a scene nothing moved into", () => {
    const s = new Stillness();
    expect(run(s, Array.from({ length: 30 }, () => frame(120)))).toBe(0);
  });
});
