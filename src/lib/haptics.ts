import type { Verdict } from "./types";

/**
 * Vibration patterns, so the verdict can be felt as well as heard: useful in a loud street, for a user who is also
 * hard of hearing, or with the sound off. Patterns differ in count and length, not just strength, so they are easy to
 * tell apart through a pocket: one short buzz safe, two medium ask, three long beware.
 * Works where the Vibration API exists (Android browsers); elsewhere it does nothing and the sound and voice carry it.
 */
export const PATTERNS = {
  safe: [60],
  ask: [140, 120, 140],
  beware: [380, 160, 380, 160, 380],
  /** Something is in front of the camera and holding still. */
  steady: [25],
  /** The gate opened: the camera and voice are on. */
  open: [40, 60, 90],
} satisfies Record<Verdict | "steady" | "open", number[]>;

export type Buzz = keyof typeof PATTERNS;

export const hapticsSupported = (): boolean => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

let enabled = typeof localStorage === "undefined" || localStorage.getItem("tor.haptics") !== "off";

export const haptics = {
  get enabled() {
    return enabled;
  },
  setEnabled(on: boolean) {
    enabled = on;
    localStorage.setItem("tor.haptics", on ? "on" : "off");
  },
  buzz(kind: Buzz) {
    if (!enabled || !hapticsSupported()) return;
    try {
      navigator.vibrate(PATTERNS[kind]);
    } catch {
      /* not allowed here: the voice still says it */
    }
  },
};
