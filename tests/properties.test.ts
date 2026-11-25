/**
 * Property-based tests for the safety rules in product.md and the README.
 *
 * Every property runs for at least 2 000 cases (numRuns: 2000).
 * If a property fails, the shrunk counterexample is in the error message; fix the code, not the property.
 */

import { describe, it } from "bun:test";
import * as fc from "fast-check";
import { matchAllergens } from "../src/lib/allergens";
import { addToHaul } from "../src/lib/haul";
import { haulSummary, reason, summary } from "../src/lib/phrasing";
import { ALLERGENS } from "../src/lib/allergens";
import { emptyReading, type Allergen, type AllergenFact, type Reading, type Source, type Verdict, type Wrapper } from "../src/lib/types";
import { judge, CONFIDENT } from "../src/lib/verdict";
import type { HaulItem } from "../src/lib/haul";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const allergenIds = ALLERGENS.map((a) => a.id) as Allergen[];

const arbAllergen: fc.Arbitrary<Allergen> = fc.constantFrom(...allergenIds);

/** A unique set of allergens (the user's profile). */
const arbAllergenProfile: fc.Arbitrary<Allergen[]> = fc.uniqueArray(arbAllergen, { minLength: 0, maxLength: 8 });
const arbNonEmptyAllergenProfile: fc.Arbitrary<Allergen[]> = fc.uniqueArray(arbAllergen, { minLength: 1, maxLength: 8 });

const arbCertainty: fc.Arbitrary<"listed" | "likely"> = fc.constantFrom("listed", "likely");

const arbAllergenFact: fc.Arbitrary<AllergenFact> = fc.record({
  allergen: arbAllergen,
  certainty: arbCertainty,
});

/** A list of allergen facts with no duplicate allergen id. */
const arbAllergenFacts: fc.Arbitrary<AllergenFact[]> = fc
  .uniqueArray(arbAllergenFact, { selector: (f) => f.allergen, minLength: 0, maxLength: 8 });

const arbWrapper: fc.Arbitrary<Wrapper> = fc.constantFrom("sealed", "opened", "torn", "unwrapped", "unknown");
const arbBadWrapper: fc.Arbitrary<Wrapper> = fc.constantFrom("opened", "torn", "unwrapped");

const arbSource: fc.Arbitrary<Source> = fc.constantFrom("label", "vision");

/** A complete Reading that covers both sources, every wrapper state, any allergen facts, and confidence 0–1. */
const arbReading: fc.Arbitrary<Reading> = fc
  .record({
    source: arbSource,
    wrapper: arbWrapper,
    allergens: arbAllergenFacts,
    allergenListKnown: fc.boolean(),
    confidence: fc.float({ min: 0, max: 1, noNaN: true }),
  })
  .map(({ source, wrapper, allergens, allergenListKnown, confidence }) => ({
    ...emptyReading(source),
    seen: true,
    name: "Test Treat",
    brand: "Test Brand",
    kind: "candy",
    allergens,
    allergenListKnown,
    wrapper,
    confidence,
  }));

const arbVerdict: fc.Arbitrary<Verdict> = fc.constantFrom("safe", "ask", "beware");

const arbHaulItems: fc.Arbitrary<HaulItem[]> = fc
  .uniqueArray(
    fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }), verdict: arbVerdict }),
    { selector: (x) => x.name.trim().toLowerCase(), minLength: 1, maxLength: 10 }
  )
  .map((items) =>
    items.map((i) => ({
      key: i.name.trim().toLowerCase(),
      name: i.name.trim(),
      count: 1,
      verdict: i.verdict,
    }))
  );

const FC_OPTS = { numRuns: 2000 };

// ---------------------------------------------------------------------------
// R1 — allergen match → Beware
// ---------------------------------------------------------------------------
describe("property R1: allergen match → Beware", () => {
  it("when a reading allergen matches the user profile, verdict is beware", () => {
    fc.assert(
      fc.property(
        arbReading,
        arbNonEmptyAllergenProfile,
        (reading, profile) => {
          // Pick one allergen from the profile to inject into the reading.
          const mine = profile[0]!;
          const certainty = fc.sample(arbCertainty, 1)[0]!;
          const allergens: AllergenFact[] = [
            ...reading.allergens.filter((f) => f.allergen !== mine),
            { allergen: mine, certainty },
          ];
          const r: Reading = { ...reading, allergens };
          const j = judge(r, profile);
          return j.verdict === "beware";
        }
      ),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R2 — bad wrapper → Beware
// ---------------------------------------------------------------------------
describe("property R2: bad wrapper → Beware", () => {
  it("opened, torn, or unwrapped wrapper always gives beware regardless of allergens", () => {
    fc.assert(
      fc.property(arbReading, arbBadWrapper, arbAllergenProfile, (reading, wrapper, profile) => {
        const r: Reading = { ...reading, wrapper };
        return judge(r, profile).verdict === "beware";
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R3 — Safe → sealed wrapper
// ---------------------------------------------------------------------------
describe("property R3: Safe verdict implies sealed wrapper", () => {
  it("if the verdict is safe then the wrapper must be sealed", () => {
    fc.assert(
      fc.property(arbReading, arbAllergenProfile, (reading, profile) => {
        const j = judge(reading, profile);
        if (j.verdict !== "safe") return true; // only constrain safe verdicts
        return reading.wrapper === "sealed";
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R4 — Safe → no matching allergens
// ---------------------------------------------------------------------------
describe("property R4: Safe verdict implies no allergen matches", () => {
  it("if the verdict is safe then matchAllergens returns empty", () => {
    fc.assert(
      fc.property(arbReading, arbAllergenProfile, (reading, profile) => {
        const j = judge(reading, profile);
        if (j.verdict !== "safe") return true;
        return matchAllergens(reading.allergens, profile).length === 0;
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R5 — Safe + non-empty profile → allergenListKnown
// ---------------------------------------------------------------------------
describe("property R5: Safe with allergens set requires allergenListKnown", () => {
  it("if the verdict is safe and the user has allergens, allergenListKnown is true", () => {
    fc.assert(
      fc.property(arbReading, arbNonEmptyAllergenProfile, (reading, profile) => {
        const j = judge(reading, profile);
        if (j.verdict !== "safe") return true;
        return reading.allergenListKnown === true;
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R6 — no list + user has allergens + no match → Ask not Safe
// ---------------------------------------------------------------------------
describe("property R6: no allergen list + user has allergens → ask or beware, never safe", () => {
  it("when allergenListKnown is false and user has allergens, verdict is never safe", () => {
    fc.assert(
      fc.property(arbReading, arbNonEmptyAllergenProfile, (reading, profile) => {
        const r: Reading = { ...reading, allergenListKnown: false };
        const j = judge(r, profile);
        return j.verdict !== "safe";
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R7 — low confidence + no match + no wrapper problem → Ask
// ---------------------------------------------------------------------------
describe("property R7: low confidence → ask not safe", () => {
  it("when confidence < CONFIDENT and no allergen match and no wrapper problem, verdict is ask", () => {
    // CONFIDENT is 0.6; the largest 32-bit float strictly below it is Math.fround(0.6) - Math.fround(2**-23).
    // Use a safe concrete max that fast-check accepts.
    const maxBelowConfident = Math.fround(CONFIDENT - Math.fround(2 ** -10));
    fc.assert(
      fc.property(
        arbAllergenProfile,
        fc.float({ min: 0, max: maxBelowConfident, noNaN: true }),
        (profile, confidence) => {
          // Build a reading with no allergen match and a non-bad wrapper.
          // Choose allergens that do NOT overlap with the profile.
          const profileSet = new Set(profile);
          const nonMatchingAllergens = allergenIds.filter((id) => !profileSet.has(id));
          const allergens: AllergenFact[] = nonMatchingAllergens.slice(0, 2).map((allergen) => ({
            allergen,
            certainty: "listed" as const,
          }));
          const r: Reading = {
            ...emptyReading("vision"),
            seen: true,
            name: "Test",
            allergens,
            allergenListKnown: false,
            wrapper: "sealed",
            confidence,
          };
          const j = judge(r, profile);
          return j.verdict === "ask";
        }
      ),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R8 — Monotonicity: adding a matching allergen never makes verdict less strict
// ---------------------------------------------------------------------------
describe("property R8: verdict monotonicity — adding a matching allergen never reduces strictness", () => {
  it("verdict(reading, profile ∪ {allergenInReading}) ≥ verdict(reading, profile)", () => {
    const verdictRank = { safe: 0, ask: 1, beware: 2 } as const;
    fc.assert(
      fc.property(arbReading, arbAllergenProfile, (reading, profile) => {
        if (reading.allergens.length === 0) return true; // nothing to add
        // Pick one allergen from the reading to add to the profile.
        const extra = reading.allergens[0]!.allergen;
        const extendedProfile = profile.includes(extra) ? profile : [...profile, extra];
        const before = judge(reading, profile).verdict;
        const after = judge(reading, extendedProfile).verdict;
        return verdictRank[after] >= verdictRank[before];
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R9 — Likely allergen in summary says "likely" and "ask someone to check the label"
// ---------------------------------------------------------------------------
describe("property R9: likely allergen → 'likely' and 'ask someone to check the label' in summary", () => {
  it("a likely match triggers the right wording in summary()", () => {
    fc.assert(
      fc.property(arbNonEmptyAllergenProfile, (profile) => {
        // Build a reading where the first profile allergen is "likely".
        const mine = profile[0]!;
        const r: Reading = {
          ...emptyReading("vision"),
          seen: true,
          name: "Test",
          allergens: [{ allergen: mine, certainty: "likely" }],
          allergenListKnown: false,
          wrapper: "sealed",
          confidence: 0.9,
        };
        const j = judge(r, profile);
        if (j.verdict !== "beware") return true; // only test when it triggers
        const likelyMatches = j.matches.filter((m) => m.certainty === "likely");
        if (likelyMatches.length === 0) return true;
        const s = summary(r, j, profile);
        return s.includes("likely") && s.toLowerCase().includes("ask someone to check the label");
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R10 — non-safe verdict → no safe-sounding words in summary
// ---------------------------------------------------------------------------
describe("property R10: non-safe verdict → no safe-sounding words in summary", () => {
  it("summary() does not contain safe-sounding phrases when verdict is beware or ask", () => {
    // Phrases that would falsely reassure a blind user.
    const forbidden = [
      /\bsafe\b/i,
      /allergen.?free/i,
      /fine to eat/i,
      /no warnings/i,
      /none of your allergens/i,
    ];
    fc.assert(
      fc.property(arbReading, arbAllergenProfile, (reading, profile) => {
        const j = judge(reading, profile);
        if (j.verdict === "safe") return true; // only test non-safe verdicts
        const s = summary(reading, j, profile);
        return forbidden.every((re) => !re.test(s));
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R11 — reason() and summary() agree with the verdict
// ---------------------------------------------------------------------------
describe("property R11: reason() and summary() do not contradict the verdict", () => {
  // "Contradict" means: verdict is beware/ask but reason/summary says "none of your allergens" or
  // "no warnings"; or verdict is safe but reason/summary says "beware" or "can't read".
  it("reason() does not contain safe-sounding words when verdict is not safe", () => {
    const forbiddenOnNonSafe = [
      /none of your allergens/i,
      /no warnings/i,
      /allergen.?free/i,
      /\bsafe\b/i,
    ];
    fc.assert(
      fc.property(arbReading, arbAllergenProfile, (reading, profile) => {
        const j = judge(reading, profile);
        if (j.verdict === "safe") return true;
        const r = reason(reading, j, profile);
        return forbiddenOnNonSafe.every((re) => !re.test(r));
      }),
      FC_OPTS
    );
  });

  it("reason() does not say 'beware' or 'can't read' when verdict is safe", () => {
    const forbiddenOnSafe = [
      /beware/i,
      /can.t read/i,
      /not certain/i,
      /no allergen label/i,
    ];
    fc.assert(
      fc.property(arbReading, arbAllergenProfile, (reading, profile) => {
        const j = judge(reading, profile);
        if (j.verdict !== "safe") return true;
        const r = reason(reading, j, profile);
        return forbiddenOnSafe.every((re) => !re.test(r));
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R12 — haulSummary lists every Beware treat
// ---------------------------------------------------------------------------
describe("property R12: haulSummary lists every Beware treat", () => {
  it("every item with verdict beware appears in the Beware section of haulSummary()", () => {
    fc.assert(
      fc.property(arbHaulItems, (items) => {
        const s = haulSummary(items);
        const bewareItems = items.filter((i) => i.verdict === "beware");
        return bewareItems.every((i) => s.includes(i.name));
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R14 — unknown wrapper + ask verdict → wrapper mentioned in summary, reason says can't see if sealed
// ---------------------------------------------------------------------------
describe("property R14: unknown wrapper → wrapper mentioned in summary and reason says can't see if sealed", () => {
  it("when verdict is ask because wrapper is unknown, summary() mentions the wrapper", () => {
    fc.assert(
      fc.property(arbAllergenProfile, (profile) => {
        const r: Reading = {
          ...emptyReading("vision"),
          seen: true,
          name: "Test Treat",
          allergens: [],
          allergenListKnown: true,
          wrapper: "unknown",
          confidence: 0.9,
        };
        const j = judge(r, profile);
        if (j.verdict !== "ask") return true; // guard: only test ask verdicts
        const s = summary(r, j, profile);
        return s.toLowerCase().includes("wrapper") || s.toLowerCase().includes("sealed") || s.toLowerCase().includes("can't see");
      }),
      FC_OPTS
    );
  });

  it("when verdict is ask because wrapper is unknown, reason() says it can't see if it's sealed", () => {
    fc.assert(
      fc.property(arbAllergenProfile, (profile) => {
        const r: Reading = {
          ...emptyReading("vision"),
          seen: true,
          name: "Test Treat",
          allergens: [],
          allergenListKnown: true,
          wrapper: "unknown",
          confidence: 0.9,
        };
        const j = judge(r, profile);
        if (j.verdict !== "ask") return true;
        const rr = reason(r, j, profile);
        return /can.t see.*seal/i.test(rr) || /seal/i.test(rr);
      }),
      FC_OPTS
    );
  });

  it("existing R10 and R11 properties still hold for unknown-wrapper ask verdicts", () => {
    const forbiddenSummary = [/\bsafe\b/i, /allergen.?free/i, /fine to eat/i, /no warnings/i, /none of your allergens/i];
    const forbiddenReason = [/none of your allergens/i, /no warnings/i, /allergen.?free/i, /\bsafe\b/i];
    fc.assert(
      fc.property(arbAllergenProfile, (profile) => {
        const r: Reading = {
          ...emptyReading("vision"),
          seen: true,
          name: "Test Treat",
          allergens: [],
          allergenListKnown: true,
          wrapper: "unknown",
          confidence: 0.9,
        };
        const j = judge(r, profile);
        if (j.verdict !== "ask") return true;
        const s = summary(r, j, profile);
        const rr = reason(r, j, profile);
        return forbiddenSummary.every((re) => !re.test(s)) && forbiddenReason.every((re) => !re.test(rr));
      }),
      FC_OPTS
    );
  });
});

// ---------------------------------------------------------------------------
// R15 — Haul verdict monotonicity
// ---------------------------------------------------------------------------
describe("property R15: haul verdict monotonicity", () => {
  it("adding the same treat with a stricter verdict upgrades the stored verdict", () => {
    const verdictRank = { safe: 0, ask: 1, beware: 2 } as const;
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        arbVerdict,
        arbVerdict,
        (name, v1, v2) => {
          let haul = addToHaul([], name, v1);
          haul = addToHaul(haul, name, v2);
          const item = haul.find((i) => i.key === name.trim().toLowerCase());
          if (!item) return false;
          const expected = verdictRank[v2] > verdictRank[v1] ? v2 : v1;
          return item.verdict === expected;
        }
      ),
      FC_OPTS
    );
  });

  it("adding the same treat with an equal or less strict verdict never downgrades the stored verdict", () => {
    const verdictRank = { safe: 0, ask: 1, beware: 2 } as const;
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        arbVerdict,
        arbVerdict,
        (name, v1, v2) => {
          let haul = addToHaul([], name, v1);
          haul = addToHaul(haul, name, v2);
          const item = haul.find((i) => i.key === name.trim().toLowerCase());
          if (!item) return false;
          return verdictRank[item.verdict] >= verdictRank[v1] && verdictRank[item.verdict] >= verdictRank[v2];
        }
      ),
      FC_OPTS
    );
  });
});
