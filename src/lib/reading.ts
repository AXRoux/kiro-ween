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

const KINDS: [RegExp, string][] = [
  [/chocolate-bars|candy-bars|bars/, "candy bar"],
  [/chocolate/, "chocolate"],
  [/gumm|jell/, "gummy candy"],
  [/lollipop/, "lollipop"],
  [/chewing-gum|gums/, "gum"],
  [/hard-candies|boiled/, "hard candy"],
  [/candies|confectioneries|sweets/, "candy"],
];
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
  const cats = (p.categories_tags ?? []).join(" ");
  const kind = KINDS.find(([re]) => re.test(cats))?.[1] ?? "";
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
 * Label data and a vision read of the same candy: facts from the label, the wrapper from the camera (only the
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
