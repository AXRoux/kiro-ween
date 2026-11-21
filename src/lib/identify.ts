import { fromVision, type VisionReport } from "./reading";
import type { Reading } from "./types";

export type IdentifyResult = { ok: true; reading: Reading } | { ok: false; reason: "no-key" | "slow-down" | "failed" };

/** Sends one frame to our server for a wrapper read. */
export async function identifyFrame(image: string): Promise<IdentifyResult> {
  try {
    const res = await fetch("/api/identify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image }),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 503) return { ok: false, reason: "no-key" };
    if (res.status === 429) return { ok: false, reason: "slow-down" };
    if (!res.ok) return { ok: false, reason: "failed" };
    return { ok: true, reading: fromVision((await res.json()) as VisionReport) };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
