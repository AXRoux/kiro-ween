import type { Verdict } from "./types";

export interface HaulItem {
  key: string;
  name: string;
  count: number;
  verdict: Verdict;
}

/** Adds a treat, counting repeats. A later, stricter verdict for the same treat wins (beware over ask over safe). */
export function addToHaul(items: HaulItem[], name: string, verdict: Verdict): HaulItem[] {
  const key = name.trim().toLowerCase();
  const rank = { safe: 0, ask: 1, beware: 2 } as const;
  const found = items.find((i) => i.key === key);
  if (!found) return [{ key, name: name.trim(), count: 1, verdict }, ...items];
  return items.map((i) => (i.key === key ? { ...i, count: i.count + 1, verdict: rank[verdict] > rank[i.verdict] ? verdict : i.verdict } : i));
}
