# Safety Properties — Requirements

These requirements restate the product's safety rules as universally quantified properties. Every property uses
EARS wording. The source is `product.md` and the README's "Never safe when we don't know" table.

---

## R1 — Beware on allergen match

**When** a reading contains an allergen fact (listed or likely) that is also in the user's allergen profile,
**the system shall** return a Beware verdict.

*Source: product.md § Verdicts — "an allergen on the user's list is listed or likely".*

---

## R2 — Beware on bad wrapper

**When** the wrapper state of a reading is `opened`, `torn`, or `unwrapped`,
**the system shall** return a Beware verdict, regardless of allergen findings.

*Source: product.md § Verdicts — "the wrapper is opened, torn or unwrapped"; README table.*

---

## R3 — Safe implies sealed wrapper

**Where** the system returns a Safe verdict,
**the system shall** only do so when the wrapper state is `sealed`.

*Contrapositive of R2; also "sealed" in product.md § Verdicts.*

---

## R4 — Safe implies no matching allergens

**Where** the system returns a Safe verdict,
**the system shall** only do so when no allergen in the reading matches the user's profile (neither listed nor
likely).

*Source: product.md § Verdicts — "the label lists none of the user's allergens".*

---

## R5 — Safe requires a known allergen list when the user has allergens

**Where** the system returns a Safe verdict and the user has at least one allergen in their profile,
**the system shall** only do so when `allergenListKnown` is `true` on the reading.

*Source: product.md § What matters — "Never say something is safe when we do not know." README: Ask someone when
"you have allergens set but there is no allergen label to read".*

---

## R6 — Ask someone when no allergen list and user has allergens

**When** the user has at least one allergen set, the reading has no allergen match, and `allergenListKnown` is
`false`,
**the system shall** return an Ask verdict (not Safe).

*Source: README table — "Ask someone: you have allergens set but there is no allergen label to read".*

---

## R7 — Ask someone when confidence is low

**When** the confidence of a vision reading is below the confidence threshold and there are no allergen matches
and no wrapper problem,
**the system shall** return an Ask verdict (not Safe).

*Source: README table — "or the read was unsure"; verdict.ts CONFIDENT = 0.6.*

---

## R8 — Monotonicity: adding a matching allergen never makes the verdict less strict

**When** a verdict is computed for a reading and an allergen profile, and the allergen profile is then extended with
one of the allergens already present in the reading,
**the system shall** return a verdict that is at least as strict (Beware ≥ Ask ≥ Safe).

*Source: product.md § What matters 1 — safety is a ratchet, not a balance.*

---

## R9 — Likely allergens are spoken with "likely" and "ask someone to check the label"

**When** the system speaks a warning about an allergen whose certainty is `likely` and that allergen matches the
user's profile,
**the system shall** include the word "likely" and the phrase "ask someone to check the label" in the summary.

*Source: product.md § What matters 1 — "anything the vision model infers is said as 'likely' and ends with 'ask
someone to check the label'".*

---

## R10 — summary() never uses safe-sounding words unless the verdict is Safe

**When** the verdict is Beware or Ask,
**the system shall** not include phrases such as "safe", "allergen free", "fine to eat", "no warnings", or
"none of your allergens" in the summary.

*Source: product.md § What matters 1 — "Never say something is safe when we do not know."*

---

## R11 — reason() and summary() agree with the verdict

**When** the system produces a reason and a summary for a reading,
**the system shall** ensure that the textual content of both is consistent with the verdict: neither shall
contradict it nor imply a different verdict than the one returned by `judge()`.

*Source: product.md § What matters 1; overall correctness requirement.*

---

## R12 — haulSummary lists every Beware treat

**When** the haul contains items with a Beware verdict,
**the system shall** include every such item's name in the "Beware:" section of the haul summary.

*Source: README — warnings first; product.md — "Never say something is safe when we do not know".*

---

## R13 — Haul verdict monotonicity

**When** the same treat is added to the haul a second time with a stricter verdict,
**the system shall** upgrade the stored verdict and never downgrade it.

*Source: haul.ts comment — "A later, stricter verdict for the same treat wins".*
