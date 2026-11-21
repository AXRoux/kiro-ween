/**
 * Hands-free scanning (Requirement 2). Works on tiny luma frames (64 x 48) so it costs nothing per frame:
 * something changes in front of the mirror, then holds still for STILL_MS, and the mirror reads it once.
 * The same still scene is never read twice: it re-arms only when the picture differs from the last read.
 */
export const W = 64;
export const H = 48;
export const DARK = 38; // mean luma below this is too dark to read a wrapper
export const MOVING = 7; // mean frame-to-frame difference above this is motion
export const STEADY = 3.2; // below this the hand is still
export const CHANGED = 9; // difference from the last read scene needed to read again
export const STILL_MS = 800;

/** RGBA pixels (already drawn at W x H) to luma. */
export function toLuma(rgba: ArrayLike<number>, length = W * H): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0, p = 0; i < length; i++, p += 4) out[i] = 0.2126 * rgba[p]! + 0.7152 * rgba[p + 1]! + 0.0722 * rgba[p + 2]!;
  return out;
}

export const brightness = (luma: Float32Array): number => {
  let s = 0;
  for (let i = 0; i < luma.length; i++) s += luma[i]!;
  return s / luma.length;
};

export function difference(a: Float32Array, b: Float32Array): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += Math.abs(a[i]! - b[i]!);
  return s / n;
}

export type Phase = "dark" | "idle" | "moving" | "steadying";

export interface Tick {
  phase: Phase;
  /** Read now. */
  fire: boolean;
  /** 0..1 while steadying, for the Still rune. */
  progress: number;
}

export class Stillness {
  private prev: Float32Array | null = null;
  private lastRead: Float32Array | null = null;
  private armed = false;
  private steadySince: number | null = null;

  /** Call after a manual read so the same scene is not read again automatically. */
  markRead(frame: Float32Array) {
    this.lastRead = frame;
    this.armed = false;
    this.steadySince = null;
  }

  feed(frame: Float32Array, now: number): Tick {
    const prev = this.prev;
    this.prev = frame;
    if (brightness(frame) < DARK) {
      this.steadySince = null;
      return { phase: "dark", fire: false, progress: 0 };
    }
    if (!prev) return { phase: "idle", fire: false, progress: 0 };

    const motion = difference(frame, prev);
    if (motion > MOVING) {
      // Something is moving. Arm only if the scene is new compared with what was last read.
      if (!this.lastRead || difference(frame, this.lastRead) > CHANGED) this.armed = true;
      this.steadySince = null;
      return { phase: "moving", fire: false, progress: 0 };
    }
    if (!this.armed) return { phase: "idle", fire: false, progress: 0 };
    if (motion > STEADY) {
      this.steadySince = null;
      return { phase: "moving", fire: false, progress: 0 };
    }
    if (this.lastRead && difference(frame, this.lastRead) <= CHANGED) {
      // Moved, then settled back into the scene we already read: nothing new in front of the mirror.
      this.armed = false;
      this.steadySince = null;
      return { phase: "idle", fire: false, progress: 0 };
    }
    this.steadySince ??= now;
    const held = now - this.steadySince;
    if (held >= STILL_MS) {
      this.markRead(frame);
      return { phase: "steadying", fire: true, progress: 1 };
    }
    return { phase: "steadying", fire: false, progress: held / STILL_MS };
  }
}
