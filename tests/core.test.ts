import { describe, expect, it } from "bun:test";
import { allergenFromWord, allergensFromTags, matchAllergens } from "../src/lib/allergens";
import { judge } from "../src/lib/verdict";
import { details, guidance, haulSummary, reason, summary } from "../src/lib/phrasing";
import { addToHaul } from "../src/lib/haul";
import { emptyReading, type Reading } from "../src/lib/types";

const label = (over: Partial<Reading> = {}): Reading => ({
  ...emptyReading("label"),
  seen: true,
  name: "Snickers",
  brand: "Mars",
  kind: "chocolate bar",
  allergens: allergensFromTags(["en:milk", "en:peanuts", "en:soybeans", "en:eggs"]),
  allergenListKnown: true,
  wrapper: "sealed",
  confidence: 1,
  ...over,
});
const vision = (over: Partial<Reading> = {}): Reading => ({
  ...emptyReading("vision"),
  seen: true,
  name: "Reese's Peanut Butter Cups",
  kind: "peanut butter cups",
  allergens: [{ allergen: "peanuts", certainty: "listed" }, { allergen: "milk", certainty: "likely" }],
  wrapper: "sealed",
  confidence: 0.9,
  ...over,
});

describe("allergens", () => {
  it("never mistakes peanuts for tree nuts, or coconut for a nut", () => {
    expect(allergenFromWord("Peanut butter")).toBe("peanuts");
    expect(allergenFromWord("hazelnuts")).toBe("tree nuts");
    expect(allergenFromWord("coconut")).toBe("coconut");
    expect(allergenFromWord("soy lecithin")).toBe("soy");
    expect(allergenFromWord("sugar")).toBeNull();
  });
  it("reads Open Food Facts tags as listed and traces as likely, and listed wins", () => {
    const facts = allergensFromTags(["en:milk", "en:gluten"], ["en:nuts", "en:milk"]);
    expect(facts).toContainEqual({ allergen: "milk", certainty: "listed" });
    expect(facts).toContainEqual({ allergen: "wheat", certainty: "listed" });
    expect(facts).toContainEqual({ allergen: "tree nuts", certainty: "likely" });
  });
  it("puts listed matches before likely ones", () => {
    const m = matchAllergens([{ allergen: "milk", certainty: "likely" }, { allergen: "peanuts", certainty: "listed" }], ["milk", "peanuts"]);
    expect(m.map((x) => x.allergen)).toEqual(["peanuts", "milk"]);
  });
});

describe("verdict", () => {
  it("bewares a listed allergen of mine", () => expect(judge(label(), ["peanuts"]).verdict).toBe("beware"));
  it("bewares a likely allergen of mine", () => expect(judge(vision(), ["milk"]).verdict).toBe("beware"));
  it("bewares an opened, torn or unwrapped candy even with no allergens set", () => {
    for (const wrapper of ["opened", "torn", "unwrapped"] as const) expect(judge(label({ wrapper }), []).verdict).toBe("beware");
  });
  it("asks someone when I have allergens and there is no label list", () =>
    expect(judge(vision({ allergens: [] }), ["sesame"]).verdict).toBe("ask"));
  it("asks someone when the read is unsure", () => expect(judge(vision({ allergens: [], confidence: 0.4 }), []).verdict).toBe("ask"));
  it("is safe only when the label lists none of mine and the wrapper is fine", () => {
    expect(judge(label(), ["sesame"]).verdict).toBe("safe");
    expect(judge(vision({ allergens: [] }), []).verdict).toBe("safe");
  });
});

describe("phrasing", () => {
  it("says the name, the kind, then the warning, then the wrapper", () => {
    const r = label();
    const s = summary(r, judge(r, ["peanuts"]), ["peanuts"]);
    expect(s).toBe("Snickers, by Mars. Chocolate bar. Warning: contains peanuts. The wrapper looks sealed.");
  });
  it("says inferred allergens as likely, and asks for the label", () => {
    const r = vision();
    const s = summary(r, judge(r, ["milk"]), ["milk"]);
    expect(s).toContain("Warning: likely contains milk. Ask someone to check the label.");
  });
  it("never says safe or no warnings without label data when I have allergens", () => {
    const r = vision({ allergens: [] });
    const s = summary(r, judge(r, ["sesame"]), ["sesame"]);
    expect(s).not.toMatch(/safe|none of your allergens|no warnings/i);
    expect(s).toContain("I can't read an allergen label for this one. Ask someone to check it.");
  });
  it("tells me not to eat an opened candy", () => {
    const r = label({ wrapper: "torn" });
    expect(summary(r, judge(r, []), [])).toContain("Beware: the wrapper looks torn. Do not eat it until someone checks.");
  });
  it("says none of my allergens are on the label only for a safe label read", () => {
    const r = label();
    expect(summary(r, judge(r, ["sesame"]), ["sesame"])).toContain("None of your allergens are on the label.");
  });
  it("says where details came from", () => {
    expect(details(label({ ingredients: "sugar, peanuts" }))).toContain("Open Food Facts");
    expect(details(vision())).toContain("ask someone to confirm");
  });
  it("gives guidance when nothing was seen", () => {
    expect(guidance({ ...emptyReading("vision"), guidance: "show the front of the wrapper" })).toBe("Show the front of the wrapper.");
    expect(guidance(emptyReading("vision"))).toMatch(/^I can't see a treat/);
  });
});

describe("haul", () => {
  it("counts repeats and keeps the strictest verdict", () => {
    let h = addToHaul([], "Snickers", "safe");
    h = addToHaul(h, "snickers", "beware");
    h = addToHaul(h, "Twix", "safe");
    expect(h.find((i) => i.key === "snickers")).toMatchObject({ count: 2, verdict: "beware" });
    expect(haulSummary(h)).toBe("You have 3 treats. Beware: 2 Snickers. No warnings: Twix.");
  });
  it("speaks an empty haul", () => expect(haulSummary([])).toMatch(/empty/));
});

import { commandFrom } from "../src/lib/listen";
describe("voice commands", () => {
  it("understands the obvious ways to ask", () => {
    expect(commandFrom("scan")).toBe("scan");
    expect(commandFrom("what is this")).toBe("scan");
    expect(commandFrom("say that again")).toBe("repeat");
    expect(commandFrom("tell me more")).toBe("more");
    expect(commandFrom("what do I have")).toBe("haul");
    expect(commandFrom("shh")).toBe("hush");
    expect(commandFrom("banana")).toBeNull();
  });
});

describe("reason (the line under the verdict)", () => {
  it("says what was found, keeping likely as likely", () => {
    const r = vision();
    expect(reason(r, judge(r, ["peanuts", "milk"]), ["peanuts", "milk"])).toBe("Contains peanuts, likely milk.");
    expect(reason(r, judge(r, ["milk"]), ["milk"])).toBe("Likely contains milk.");
  });
  it("names a wrapper problem", () => {
    const r = label({ wrapper: "torn" });
    expect(reason(r, judge(r, []), [])).toBe("The wrapper looks torn.");
    const u = label({ wrapper: "unwrapped" });
    expect(reason(u, judge(u, ["peanuts"]), ["peanuts"])).toBe("Contains peanuts. It looks unwrapped.");
  });
  it("never sounds safe unless the verdict is safe", () => {
    const r = vision({ allergens: [] });
    const j = judge(r, ["egg"]);
    expect(j.verdict).toBe("ask");
    expect(reason(r, j, ["egg"])).toBe("No allergen label to check.");
    const s = label();
    expect(reason(s, judge(s, ["coconut"]), ["coconut"])).toBe("None of your allergens are on the label.");
  });
});

describe("haptics", () => {
  it("gives each verdict a pattern you can tell apart by count, not just strength", async () => {
    const { PATTERNS } = await import("../src/lib/haptics");
    const buzzes = (p: number[]) => Math.ceil(p.length / 2);
    expect(buzzes(PATTERNS.safe)).toBe(1);
    expect(buzzes(PATTERNS.ask)).toBe(2);
    expect(buzzes(PATTERNS.beware)).toBe(3);
    // beware is also the longest: it should be impossible to miss
    expect(Math.min(...PATTERNS.beware.filter((_, i) => i % 2 === 0))).toBeGreaterThan(Math.max(...PATTERNS.ask));
  });
});
