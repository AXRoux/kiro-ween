# Safety Properties — Design

## Approach

The safety rules are pure functions over `Reading` and `Allergen[]`. They have no DOM, network or timing
dependencies, so they can be verified exhaustively with property-based testing (PBT). PBT generates hundreds of
random inputs, shrinks any counterexample to its minimal form, and checks every requirement in one test run.

## Library

**fast-check** (`fast-check` on npm / bun). It runs in Bun's test runner with no extra glue. Each property is
run for at least 2 000 cases (`numRuns: 2000`).

## Arbitraries

### `arbAllergen`
Picks one element from the eight `Allergen` values.

### `arbAllergenProfile`
An array of unique allergens (`fc.uniqueArray(arbAllergen)`), length 0–8. The empty array represents a user with
no allergens set.

### `arbAllergenFact`
A pair `{ allergen, certainty }` where `certainty` is `"listed"` or `"likely"`.

### `arbAllergenFacts`
An array of `AllergenFact`s with no duplicate allergen, length 0–8.

### `arbWrapper`
One of the five `Wrapper` values: `"sealed"`, `"opened"`, `"torn"`, `"unwrapped"`, `"unknown"`.

### `arbSource`
One of `"label"` or `"vision"`.

### `arbReading`
A full `Reading` built from `arbSource`, `arbWrapper`, `arbAllergenFacts`, a boolean for
`allergenListKnown`, and a `confidence` value drawn uniformly from [0, 1]. Fields not relevant to safety rules
(`name`, `brand`, `kind`, etc.) are filled with simple fixed strings or empty strings, since the safety rules do
not depend on them. `seen` is always `true` so the reading is considered a valid read.

### `arbHaulItems`
A non-empty array of `HaulItem` values with names and verdicts chosen at random.

## Properties

Each requirement from requirements.md becomes one `it("property: …")` block using `fc.assert(fc.property(…))`.

| Req | Property | Arbitraries |
|-----|----------|-------------|
| R1  | allergen match → beware | `arbReading`, `arbAllergenProfile` — constrained so at least one reading allergen is in the profile |
| R2  | bad wrapper → beware | `arbReading` with wrapper forced to opened/torn/unwrapped, `arbAllergenProfile` |
| R3  | safe → sealed | `arbReading`, `arbAllergenProfile` |
| R4  | safe → no matching allergens | `arbReading`, `arbAllergenProfile` |
| R5  | safe + non-empty profile → allergenListKnown | `arbReading`, non-empty `arbAllergenProfile` |
| R6  | no list + user has allergens + no match → ask not safe | `arbReading` with `allergenListKnown: false`, non-empty `arbAllergenProfile` |
| R7  | low confidence + no match + no wrapper problem → ask | `arbReading` with `confidence < CONFIDENT`, `arbAllergenProfile` |
| R8  | monotonicity | two related profiles derived from one `arbReading` + `arbAllergenProfile` |
| R9  | likely allergen → "likely" + "ask someone to check the label" in summary | `arbReading` with ≥1 likely allergen matching the profile |
| R10 | non-safe verdict → no safe-sounding words in summary | `arbReading`, `arbAllergenProfile` |
| R11 | reason + summary agree with verdict | `arbReading`, `arbAllergenProfile` |
| R12 | haulSummary contains every beware name | `arbHaulItems` |
| R13 | haul verdict monotonicity | pairs of verdicts for the same treat name |

## File layout

```
tests/
  properties.test.ts   all property tests (new)
```

No new source files. `fast-check` is the only new dependency, added as a dev dependency.

## Counterexample handling

If a property fails: the shrunk counterexample is logged, the product rules in `product.md` and the README are
checked, and the minimal fix is applied to the library code (not the property). The property is never weakened.
