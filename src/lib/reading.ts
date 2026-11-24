import { allergenFromWord, allergensFromTags } from "./allergens";
import { emptyReading, type AllergenFact, type Reading, type Wrapper } from "./types";

/** The Open Food Facts fields we ask for. */
export const OFF_FIELDS = "code,product_name,product_name_en,generic_name,brands,quantity,categories_tags,allergens_tags,traces_tags,ingredients_text,ingredients_text_en,states_tags,nutriments";

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  categories_tags?: string[];
  allergens_tags?: string[];
  traces_tags?: string[];
  ingredients_text?: string;
  ingredients_text_en?: string;
  states_tags?: string[];
  nutriments?: Record<string, number | string | undefined>;
}

/**
 * What kind of treat it is, said after the name ("Fig Bar Blueberry, by Nature's Bakery. Fig bar."). Candy and the
 * better-for-you alternatives handed out at Halloween (fig and granola bars, fruit snacks, pretzels, raisins...).
 * The name is checked first: Open Food Facts files a Nature's Bakery fig bar under "biscuits" and plain "bars".
 */
const NAME_KINDS: [RegExp, string][] = [
  [/\bfig (bar|newton|roll)s?\b|\bfig newtons?\b/, "fig bar"],
  [/\b(granola|oat|muesli|cereal|chewy) bars?\b/, "granola bar"],
  [/\bprotein bars?\b/, "protein bar"],
  [/\b(fruit|date|nut) (and \w+ )?bars?\b|\blarabar\b|\brxbar\b/, "fruit and nut bar"],
  [/\bfruit snacks?\b|\bfruit gumm/, "fruit snacks"],
  [/\bfruit (leather|roll|strip)s?\b|\bfruit by the foot\b/, "fruit leather"],
  [/\bpretzels?\b/, "pretzels"],
  [/\bpopcorn\b/, "popcorn"],
  [/\braisins?\b/, "raisins"],
  [/\bapple ?sauce\b|\bpouch\b/, "fruit pouch"],
];
const CATEGORY_KINDS: [RegExp, string][] = [
  [/fig-(bars|rolls|biscuits)/, "fig bar"],
  [/granola-bars|cereal-bars|muesli-bars/, "granola bar"],
  [/protein-bars/, "protein bar"],
  [/fruit-snacks|fruit-gummies/, "fruit snacks"],
  [/fruit-leathers|fruit-rolls/, "fruit leather"],
  [/chocolate-bars|candy-bars/, "candy bar"],
  [/chocolate/, "chocolate"],
  [/gumm|jell/, "gummy candy"],
  [/lollipop/, "lollipop"],
  [/chewing-gum|gums/, "gum"],
  [/hard-candies|boiled/, "hard candy"],
  [/candies|confectioneries|sweets/, "candy"],
  [/pretzels/, "pretzels"],
  [/popcorn/, "popcorn"],
  [/crisps|chips/, "chips"],
  [/crackers/, "crackers"],
  [/cookies|biscuits/, "cookie"],
  [/raisins/, "raisins"],
  [/dried-fruits/, "dried fruit"],
  [/compotes|apple-sauces|fruit-purees/, "fruit pouch"],
  [/juices|fruit-drinks/, "juice"],
  [/bars/, "snack bar"],
];

/** The kind of treat, from its name, then its Open Food Facts categories. Empty when nothing fits. */
export function treatKind(name: string, categories: string[]): string {
  const n = name.toLowerCase();
  const cats = categories.join(" ");
  return NAME_KINDS.find(([re]) => re.test(n))?.[1] ?? CATEGORY_KINDS.find(([re]) => re.test(cats))?.[1] ?? "";
}
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * An Open Food Facts product to a Reading. The allergen list counts as known only when it is non-empty or the
 * ingredients are marked complete: an empty list on an unfinished entry means "nobody entered it", not "none".
 */
export function fromOpenFoodFacts(p: OffProduct, barcode: string): Reading {
  const name = (p.product_name_en || p.product_name || p.generic_name || "").trim();
  const tags = p.allergens_tags ?? [];
  const ingredients = (p.ingredients_text_en || p.ingredients_text || "").trim();
  const complete = (p.states_tags ?? []).includes("en:ingredients-completed");
  const kind = treatKind(name, p.categories_tags ?? []);
  return {
    ...emptyReading("label"),
    seen: Boolean(name),
    name,
    brand: (p.brands ?? "").split(",")[0]?.trim() ?? "",
    kind,
    size: (p.quantity ?? "").trim(),
    allergens: allergensFromTags(tags, p.traces_tags ?? []),
    allergenListKnown: tags.length > 0 || (complete && ingredients.length > 0),
    confidence: name ? 1 : 0,
    ingredients,
    sugarGrams: num(p.nutriments?.sugars_100g),
    calories: num(p.nutriments?.["energy-kcal_100g"]),
    barcode,
  };
}

/** The server's report (see server/identify.ts) to a Reading. */
export interface VisionReport {
  seen: boolean;
  name: string;
  brand: string;
  kind: string;
  flavor: string;
  size: string;
  allergens: { name: string; certainty: "listed" | "likely" }[];
  wrapper: Wrapper;
  confidence: number;
  guidance: string;
}

export function fromVision(v: VisionReport): Reading {
  const allergens: AllergenFact[] = [];
  for (const a of v.allergens) {
    const id = allergenFromWord(a.name);
    if (id && !allergens.some((x) => x.allergen === id)) allergens.push({ allergen: id, certainty: a.certainty });
  }
  return {
    ...emptyReading("vision"),
    seen: v.seen,
    name: v.name,
    brand: v.brand,
    kind: v.kind,
    flavor: v.flavor,
    size: v.size,
    allergens,
    allergenListKnown: false,
    wrapper: v.wrapper,
    confidence: v.confidence,
    guidance: v.guidance,
  };
}

/**
 * Label data and a vision read of the same treat: facts from the label, the wrapper from the camera (only the
 * camera can see a tear). If the label has no allergen list, the vision read's allergens are kept, as said.
 */
export function merge(label: Reading | null, vision: Reading | null): Reading | null {
  if (label?.seen && vision) {
    return {
      ...label,
      kind: label.kind || vision.kind,
      flavor: label.flavor || vision.flavor,
      size: label.size || vision.size,
      allergens: label.allergenListKnown ? label.allergens : [...label.allergens, ...vision.allergens.filter((v) => !label.allergens.some((l) => l.allergen === v.allergen))],
      wrapper: vision.wrapper,
    };
  }
  if (label?.seen) return label;
  return vision;
}
