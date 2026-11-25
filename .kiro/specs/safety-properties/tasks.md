# Safety Properties — Tasks

## Task 1 — Write requirements.md
- [x] Restate each product safety rule as a universally quantified EARS property.
- [x] Cover: allergen match, bad wrapper, safe implies sealed, safe implies no matches, safe requires known list,
  ask on no list, ask on low confidence, monotonicity, likely-allergen wording, no safe-sounding words on
  non-safe verdicts, reason/summary agreement, haul summary completeness, haul verdict monotonicity.

## Task 2 — Write design.md
- [x] Document the PBT approach, the arbitraries, the property-to-requirement mapping, and the counterexample
  handling policy.

## Task 3 — Add fast-check
- [x] Run `bun add -d fast-check`.

## Task 4 — Write tests/properties.test.ts
- [x] Define arbitraries: `arbAllergen`, `arbAllergenProfile`, `arbAllergenFact`, `arbAllergenFacts`,
  `arbWrapper`, `arbSource`, `arbReading`, `arbHaulItems`.
- [x] Write one property per requirement (R1–R13), each with `numRuns: 2000`.
- [x] Ensure the file compiles with `bun run typecheck`.

## Task 5 — Run bun test; fix any failing property
- [x] Run `bun test`.
- [x] For each failing property: record the shrunk counterexample, decide whether the code or the property is
  wrong by checking product.md and the README, fix the code minimally, and document the fix here.
- [x] Run `bun test` and `bun run typecheck` until both pass cleanly.

### Fixes applied

**R3 counterexample — unknown wrapper gave Safe verdict (code bug)**

Shrunk counterexample:
```
Reading { wrapper: "unknown", allergenListKnown: false, confidence: 0.6, allergens: [] }
Profile: []
```
With an empty profile and confidence exactly at CONFIDENT (0.6), the old `judge()` fell through to `"safe"` because
`wrapper === "unknown"` was not in the bad-wrapper set (`opened | torn | unwrapped`) and the low-confidence and
no-list guards did not fire. The product rule is unambiguous: "Safe: **sealed**, and the label lists none of your
allergens." An unknown wrapper means we cannot confirm the wrapper is sealed, so the verdict cannot be Safe.

**Fix** (`src/lib/verdict.ts`): added `|| reading.wrapper !== "sealed"` to the Ask guard, so any wrapper state
other than `"sealed"` prevents a Safe verdict. The comment was updated to list this as step 5 in the decision order.

---

**R7 test fix — `CONFIDENT - Number.EPSILON` is not a 32-bit float**

`fc.float` requires its `max` to be a 32-bit float (checked via `Math.fround`). `0.6 - Number.EPSILON` is a
64-bit double. The property itself was correct; the issue was the arbitrary construction. Fixed by using
`Math.fround(CONFIDENT - Math.fround(2 ** -10))` as the upper bound, which is well below 0.6 and representable
as a 32-bit float.

## Task 6 — Unknown-wrapper wording and documentation
- [x] `summary()`: when verdict is ask and wrapper is unknown, say "I can't see whether the wrapper is sealed. Ask someone to check it." If the allergen label is also missing while the user has allergens set, say both reasons as separate sentences.
- [x] `reason()`: when verdict is ask and wrapper is unknown, return "Can't see if it's sealed."
- [x] Added property R14 to `tests/properties.test.ts`: whenever verdict is ask because wrapper is unknown, `summary()` mentions the wrapper and `reason()` says it can't see if it's sealed; R10/R11 still hold for that case. Former R13 renumbered R15.
- [x] README.md "Never safe when we don't know" table: Ask someone row now also covers "or the camera could not see whether the wrapper is sealed (a barcode alone cannot show that)".
- [x] `.kiro/steering/product.md` verdict list: Ask someone bullet updated to match.
- [x] Ran `bun test` and `bun run typecheck`: all pass.
