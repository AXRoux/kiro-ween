import { allergenSpoken } from "./allergens";
import type { Allergen, Judgement, Reading } from "./types";
import type { HaulItem } from "./haul";

/**
 * Everything the castle says. Rule one of product.md lives here: nothing is called safe unless the verdict is safe,
 * and anything inferred is said as "likely" with "ask someone to check the label".
 */

const list = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const sentence = (s: string): string => {
  const t = s.trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? "" : ".") : "";
};

/** "Snickers, by Mars" or just "Snickers". The brand is dropped when the name already carries it. */
export function title(r: Reading): string {
  const name = r.name.trim() || "A treat";
  const brand = r.brand.trim();
  return brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name}, by ${brand}` : name;
}

/** The first thing said: name, kind, warnings, wrapper, verdict. Short enough to hear in a few seconds. */
export function summary(r: Reading, j: Judgement, mine: Allergen[]): string {
  const parts: string[] = [];
  parts.push(sentence(title(r)));
  const kind = [r.size, r.flavor && !r.name.toLowerCase().includes(r.flavor.toLowerCase()) ? r.flavor : "", r.kind].filter(Boolean).join(" ");
  if (kind) parts.push(sentence(kind));

  const listed = j.matches.filter((m) => m.certainty === "listed").map((m) => allergenSpoken(m.allergen));
  const likely = j.matches.filter((m) => m.certainty === "likely").map((m) => allergenSpoken(m.allergen));
  if (listed.length) parts.push(`Warning: contains ${list(listed)}.`);
  if (likely.length) parts.push(`Warning: likely contains ${list(likely)}. Ask someone to check the label.`);

  if (r.wrapper === "opened" || r.wrapper === "torn") parts.push(`Beware: the wrapper looks ${r.wrapper}. Do not eat it until someone checks.`);
  else if (r.wrapper === "unwrapped") parts.push("Beware: it looks unwrapped. Do not eat it until someone checks.");
  else if (r.wrapper === "sealed") parts.push("The wrapper looks sealed.");

  if (j.verdict === "safe") {
    parts.push(mine.length ? "None of your allergens are on the label." : "No warnings.");
  } else if (j.verdict === "ask") {
    if (mine.length && !r.allergenListKnown) parts.push("I can't read an allergen label for this one. Ask someone to check it.");
    else parts.push("I'm not certain about this one. Ask someone to check it.");
  }
  return parts.join(" ");
}

/**
 * The one line printed under the verdict, so it can be read at a glance: why it is Beware, Ask or Safe.
 * Same rules as summary(): "likely" stays "likely", and nothing reads as safe unless the verdict is safe.
 */
export function reason(r: Reading, j: Judgement, mine: Allergen[]): string {
  const listed = j.matches.filter((m) => m.certainty === "listed").map((m) => allergenSpoken(m.allergen));
  const likely = j.matches.filter((m) => m.certainty === "likely").map((m) => allergenSpoken(m.allergen));
  if (j.verdict === "beware") {
    const found = [listed.length ? `contains ${list(listed)}` : "", likely.length ? `${listed.length ? "likely" : "likely contains"} ${list(likely)}` : ""];
    const wrapper = j.wrapperProblem ? (r.wrapper === "unwrapped" ? "it looks unwrapped" : `the wrapper looks ${r.wrapper}`) : "";
    return [found.filter(Boolean).join(", "), wrapper].filter(Boolean).map(sentence).join(" ");
  }
  if (j.verdict === "ask") return mine.length && !r.allergenListKnown ? "No allergen label to check." : "Not certain about this one.";
  return mine.length ? "None of your allergens are on the label." : "No warnings.";
}

/** Said on "more": ingredients, sugar, calories, the barcode, and where the facts came from. */
export function details(r: Reading): string {
  const parts: string[] = [];
  if (r.ingredients) parts.push(`Ingredients: ${r.ingredients.replace(/\s+/g, " ").slice(0, 400)}.`);
  if (r.sugarGrams !== null) parts.push(`About ${Math.round(r.sugarGrams)} grams of sugar per hundred grams.`);
  if (r.calories !== null) parts.push(`About ${Math.round(r.calories)} calories per hundred grams.`);
  const other = r.allergens.map((a) => (a.certainty === "listed" ? allergenSpoken(a.allergen) : `likely ${allergenSpoken(a.allergen)}`));
  if (other.length) parts.push(`All allergens I know of: ${list(other)}.`);
  parts.push(r.source === "label" ? "These facts come from the product's label data, from Open Food Facts." : "I read this from the wrapper, so ask someone to confirm anything important.");
  return parts.join(" ");
}

/** When no treat was seen. */
export function guidance(r: Reading): string {
  return sentence(r.guidance || "I can't see a treat. Hold it about a hand's width from the camera, front of the wrapper facing it");
}

/** The haul, warnings first: "You have 7 treats. 2 to check: ..." */
export function haulSummary(items: HaulItem[]): string {
  if (items.length === 0) return "Your haul is empty. Hold up a treat to start.";
  const total = items.reduce((s, i) => s + i.count, 0);
  const named = (i: HaulItem) => (i.count > 1 ? `${i.count} ${i.name}` : i.name);
  const warn = items.filter((i) => i.verdict === "beware");
  const ask = items.filter((i) => i.verdict === "ask");
  const fine = items.filter((i) => i.verdict === "safe");
  const parts = [`You have ${total} ${total === 1 ? "treat" : "treats"}.`];
  if (warn.length) parts.push(`Beware: ${list(warn.map(named))}.`);
  if (ask.length) parts.push(`Ask someone about: ${list(ask.map(named))}.`);
  if (fine.length) parts.push(`No warnings: ${list(fine.map(named))}.`);
  return parts.join(" ");
}

export const GREETING =
  "The gate is open. Hold a treat up to the camera, about a hand's width away, and keep it still. I'll read it as soon as it stops moving. Or tap the window, or press space, to read now. R repeats, M tells you more, B is your haul, S is settings.";

export const HELP =
  "Tap the window or press space to read. R to repeat, M for more details, B for your haul, S for settings, V to change my voice, escape to hush. Tap the bar at the top of the screen to stop me talking. You can also say scan, repeat, more, haul or help.";

export const TOO_DARK = "Too dark. Turn on a light.";
export const NO_KEY =
  "I can't read wrappers right now, but barcodes still work. Turn the treat until its barcode faces the camera.";
