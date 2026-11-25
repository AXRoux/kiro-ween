import { matchAllergens } from "./allergens";
import type { Allergen, Judgement, Reading } from "./types";

/** Below this the vision read is too unsure to call anything safe. */
export const CONFIDENT = 0.6;

/**
 * The verdict, by the rules in product.md, in order:
 * 1. wrapper opened, torn or unwrapped: beware
 * 2. one of the user's allergens listed: beware
 * 3. one of the user's allergens likely: beware
 * 4. no real allergen list while the user has allergens set, or an unsure read: ask someone
 * 5. wrapper is not confirmed sealed (unknown): ask someone — we cannot call something safe when we cannot see the wrapper
 * 6. otherwise: safe
 */
export function judge(reading: Reading, mine: Allergen[]): Judgement {
  const wrapperProblem = reading.wrapper === "opened" || reading.wrapper === "torn" || reading.wrapper === "unwrapped";
  const matches = matchAllergens(reading.allergens, mine);
  if (wrapperProblem || matches.length > 0) return { verdict: "beware", matches, wrapperProblem };
  if ((mine.length > 0 && !reading.allergenListKnown) || reading.confidence < CONFIDENT || reading.wrapper !== "sealed") return { verdict: "ask", matches, wrapperProblem };
  return { verdict: "safe", matches, wrapperProblem };
}
