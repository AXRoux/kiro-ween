import { describe, expect, it } from "bun:test";
import { DARK_REMIND_MS, darkWarning, type DarkState } from "../src/lib/darkness";

/** Feed a run of frames (every 100 ms, like the watch loop) and count the warnings. */
function run(frames: { dark: boolean; hidden?: boolean }[], start: DarkState = { dark: false, saidAt: null }) {
  let state = start;
  const said: number[] = [];
  frames.forEach((f, i) => {
    const now = 10_000 + i * 100;
    const r = darkWarning(state, now, f.dark, f.hidden ?? false);
    if (r.say) said.push(now);
    state = r.next;
  });
  return said;
}
const dark = (seconds: number, hidden = false) => Array.from({ length: seconds * 10 }, () => ({ dark: true, hidden }));
const light = (seconds: number) => Array.from({ length: seconds * 10 }, () => ({ dark: false }));

describe("the darkness warning", () => {
  it("is said once when it gets dark, not every few seconds", () => {
    expect(run(dark(30)).length).toBe(1);
  });
  it("is repeated at most once a minute while it stays dark", () => {
    const said = run(dark(185));
    expect(said.length).toBe(4); // 0 s, 60 s, 120 s, 180 s
    for (let i = 1; i < said.length; i++) expect(said[i]! - said[i - 1]!).toBeGreaterThanOrEqual(DARK_REMIND_MS);
  });
  it("is never said while the app is hidden", () => {
    expect(run(dark(300, true)).length).toBe(0);
  });
  it("is said again when it gets dark again after the light came back", () => {
    expect(run([...dark(3), ...light(10), ...dark(3)]).length).toBe(2);
  });
  it("does not chatter when the light flickers on and off", () => {
    const flicker = Array.from({ length: 200 }, (_, i) => ({ dark: i % 4 < 2 }));
    expect(run(flicker).length).toBe(1);
  });
});
