import { fromOpenFoodFacts, OFF_FIELDS, type OffProduct } from "./reading";
import type { Reading } from "./types";

const cache = new Map<string, Reading | null>();

/** Label data for a barcode from Open Food Facts, or null when unknown or unreachable (then the vision read takes over). */
export async function lookupBarcode(code: string): Promise<Reading | null> {
  if (cache.has(code)) return cache.get(code)!;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { status?: number; product?: OffProduct };
    const reading = body.status === 1 && body.product ? fromOpenFoodFacts(body.product, code) : null;
    const result = reading?.seen ? reading : null;
    cache.set(code, result);
    return result;
  } catch {
    return null;
  }
}
