import { describe, expect, it } from "bun:test";
import { fromOpenFoodFacts, fromVision, merge, treatKind } from "../src/lib/reading";

// The real Open Food Facts entry for a 1.86 oz Snickers (040000424314), trimmed.
const snickers = {
  product_name: "Snickers",
  brands: "Snickers",
  quantity: "1.86oz",
  categories_tags: ["en:snacks", "en:sweet-snacks", "en:confectioneries", "en:chocolate-candies", "en:candy-bars"],
  allergens_tags: ["en:eggs", "en:milk", "en:peanuts", "en:soybeans"],
  nutriments: { sugars_100g: 53.1, "energy-kcal_100g": 474.4 },
};

describe("Open Food Facts", () => {
  it("reads name, kind, size, allergens and nutrition", () => {
    const r = fromOpenFoodFacts(snickers, "040000424314");
    expect(r).toMatchObject({ source: "label", seen: true, name: "Snickers", kind: "candy bar", size: "1.86oz", allergenListKnown: true, sugarGrams: 53.1 });
    expect(r.allergens.map((a) => a.allergen).sort()).toEqual(["egg", "milk", "peanuts", "soy"]);
  });
  it("does not treat an empty allergen list on an unfinished entry as 'none'", () => {
    // The real entry for 040000001027 is a Snickers with no allergens entered.
    expect(fromOpenFoodFacts({ product_name: "Snickers Chocolate Candy Bar" }, "040000001027").allergenListKnown).toBe(false);
    expect(fromOpenFoodFacts({ product_name: "Skittles", ingredients_text: "sugar, corn syrup", states_tags: ["en:ingredients-completed"] }, "1").allergenListKnown).toBe(true);
  });
});

describe("treats that are not candy", () => {
  // The real Open Food Facts entries for Nature's Bakery fig bars (0047495491531, 0047495610048), trimmed.
  it("calls a Nature's Bakery fig bar a fig bar, not a candy bar or a cookie", () => {
    const r = fromOpenFoodFacts(
      { product_name: "Fig Bar Blueberry", brands: "Nature's Bakery", categories_tags: ["en:snacks", "en:sweet-snacks", "en:biscuits-and-cakes", "en:biscuits-and-crackers", "en:biscuits", "en:bars"], allergens_tags: ["en:gluten"] },
      "0047495491531",
    );
    expect(r).toMatchObject({ seen: true, name: "Fig Bar Blueberry", brand: "Nature's Bakery", kind: "fig bar", allergenListKnown: true });
    expect(r.allergens).toEqual([{ allergen: "wheat", certainty: "listed" }]);
    expect(fromOpenFoodFacts({ product_name: "Fig bar", categories_tags: ["en:snacks", "en:sweet-snacks", "en:bars"] }, "0047495610048").kind).toBe("fig bar");
  });
  it("names the common better-for-you treats", () => {
    expect(treatKind("Chewy Granola Bars Chocolate Chip", ["en:bars"])).toBe("granola bar");
    expect(treatKind("Welch's Mixed Fruit", ["en:snacks", "en:fruit-snacks"])).toBe("fruit snacks");
    expect(treatKind("Mott's Applesauce", [])).toBe("fruit pouch");
    expect(treatKind("Sun-Maid", ["en:dried-fruits", "en:raisins"])).toBe("raisins");
    expect(treatKind("Mini Pretzels", ["en:salty-snacks"])).toBe("pretzels");
    expect(treatKind("Something", ["en:snacks", "en:bars"])).toBe("snack bar");
  });
  it("still calls candy candy", () => {
    expect(treatKind("Snickers", snickers.categories_tags)).toBe("candy bar");
    expect(treatKind("Skittles", ["en:confectioneries", "en:candies"])).toBe("candy");
  });
});

describe("merge", () => {
  const vision = fromVision({ seen: true, name: "Snickers", brand: "Mars", kind: "chocolate bar", flavor: "", size: "fun size", allergens: [{ name: "peanuts", certainty: "listed" }, { name: "tree nuts", certainty: "likely" }], wrapper: "torn", confidence: 0.9, guidance: "" });
  it("takes facts from the label and the wrapper from the camera", () => {
    const r = merge(fromOpenFoodFacts(snickers, "040000424314"), vision)!;
    expect(r.source).toBe("label");
    expect(r.wrapper).toBe("torn");
    expect(r.allergens.some((a) => a.allergen === "tree nuts")).toBe(false);
  });
  it("keeps the camera's allergens when the label has none entered", () => {
    const r = merge(fromOpenFoodFacts({ product_name: "Snickers" }, "1"), vision)!;
    expect(r.allergens).toContainEqual({ allergen: "tree nuts", certainty: "likely" });
  });
  it("falls back to the vision read with no label", () => expect(merge(null, vision)?.source).toBe("vision"));
});
