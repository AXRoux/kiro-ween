/** The allergens a user can ask the castle to watch for. */
export type Allergen = "peanuts" | "tree nuts" | "milk" | "egg" | "soy" | "wheat" | "sesame" | "coconut";

/** Where a fact came from. Label data is stated as fact; a vision read is "likely" unless printed on the wrapper. */
export type Source = "label" | "vision";

export type Wrapper = "sealed" | "opened" | "torn" | "unwrapped" | "unknown";

export interface AllergenFact {
  allergen: Allergen;
  /** listed: on the label or printed on the wrapper. likely: inferred from what the product usually contains. */
  certainty: "listed" | "likely";
}

/** One shape for both paths: an Open Food Facts product, or the model's read of a wrapper. */
export interface Reading {
  source: Source;
  seen: boolean;
  name: string;
  brand: string;
  kind: string;
  flavor: string;
  size: string;
  allergens: AllergenFact[];
  /** True when we have an actual allergen list (label data), even if it is empty. */
  allergenListKnown: boolean;
  wrapper: Wrapper;
  confidence: number;
  /** What to do when nothing was seen ("hold it closer"). */
  guidance: string;
  ingredients: string;
  sugarGrams: number | null;
  calories: number | null;
  barcode: string | null;
}

export type Verdict = "safe" | "ask" | "beware";

export interface Judgement {
  verdict: Verdict;
  /** The user's allergens that matched, strongest certainty first. */
  matches: AllergenFact[];
  wrapperProblem: boolean;
}

export const emptyReading = (source: Source): Reading => ({
  source,
  seen: false,
  name: "",
  brand: "",
  kind: "",
  flavor: "",
  size: "",
  allergens: [],
  allergenListKnown: false,
  wrapper: "unknown",
  confidence: 0,
  guidance: "",
  ingredients: "",
  sugarGrams: null,
  calories: null,
  barcode: null,
});
