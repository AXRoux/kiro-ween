import type { Allergen, AllergenFact } from "./types";

export const ALLERGENS: { id: Allergen; label: string; words: string[]; offTags: string[] }[] = [
  { id: "peanuts", label: "Peanuts", words: ["peanut", "peanuts", "groundnut", "arachis"], offTags: ["en:peanuts"] },
  {
    id: "tree nuts",
    label: "Tree nuts",
    words: ["tree nut", "tree nuts", "nuts", "almond", "almonds", "hazelnut", "hazelnuts", "cashew", "pecan", "walnut", "pistachio", "macadamia"],
    offTags: ["en:nuts", "en:almonds", "en:hazelnuts", "en:cashew-nuts", "en:pecan-nuts", "en:walnuts", "en:pistachio-nuts", "en:macadamia-nuts"],
  },
  { id: "milk", label: "Milk", words: ["milk", "dairy", "lactose", "whey", "butter", "cream", "milk chocolate"], offTags: ["en:milk"] },
  { id: "egg", label: "Egg", words: ["egg", "eggs", "albumen"], offTags: ["en:eggs"] },
  { id: "soy", label: "Soy", words: ["soy", "soya", "soybean", "soy lecithin"], offTags: ["en:soybeans"] },
  { id: "wheat", label: "Wheat and gluten", words: ["wheat", "gluten", "barley", "rye", "malt", "flour"], offTags: ["en:gluten", "en:wheat"] },
  { id: "sesame", label: "Sesame", words: ["sesame"], offTags: ["en:sesame-seeds"] },
  { id: "coconut", label: "Coconut", words: ["coconut"], offTags: ["en:coconut"] },
];

const byId = new Map(ALLERGENS.map((a) => [a.id, a]));
export const allergenLabel = (id: Allergen): string => byId.get(id)?.label ?? id;
/** How the allergen is said in a sentence: "contains peanuts", "contains wheat". */
export const allergenSpoken = (id: Allergen): string => (id === "wheat" ? "wheat or gluten" : id);

/** Maps a free word ("hazelnuts", "Milk chocolate", "soy lecithin") to one allergen, or null. */
export function allergenFromWord(word: string): Allergen | null {
  const w = word.toLowerCase().trim();
  if (!w) return null;
  // Peanut first: "peanut" contains "nut" and must not become a tree nut.
  if (/pea ?nut|groundnut|arachis/.test(w)) return "peanuts";
  if (/coconut/.test(w)) return "coconut";
  for (const a of ALLERGENS) if (a.words.some((x) => w === x || w.includes(x))) return a.id;
  return null;
}

/** Open Food Facts allergen and trace tags ("en:milk", "en:nuts") to allergen facts. Traces count as likely. */
export function allergensFromTags(tags: string[], traces: string[] = []): AllergenFact[] {
  const out = new Map<Allergen, AllergenFact>();
  const add = (list: string[], certainty: AllergenFact["certainty"]) => {
    for (const tag of list) {
      const t = tag.toLowerCase();
      const hit = ALLERGENS.find((a) => a.offTags.includes(t)) ?? null;
      const id = hit?.id ?? allergenFromWord(t.replace(/^[a-z]{2}:/, "").replace(/-/g, " "));
      if (!id) continue;
      const prev = out.get(id);
      if (!prev || (prev.certainty === "likely" && certainty === "listed")) out.set(id, { allergen: id, certainty });
    }
  };
  add(tags, "listed");
  add(traces, "likely");
  return [...out.values()];
}

/** The facts that concern this user, listed before likely. */
export function matchAllergens(facts: AllergenFact[], mine: Allergen[]): AllergenFact[] {
  const want = new Set(mine);
  return facts
    .filter((f) => want.has(f.allergen))
    .sort((a, b) => (a.certainty === b.certainty ? 0 : a.certainty === "listed" ? -1 : 1));
}
