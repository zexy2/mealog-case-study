# Multi-instance count trace

- Claim: #193
- Branch: `agent/codex5/multi-instance-counting`
- Base: `origin/main` at `07b09457e81bc6f7a602c071c1846034d91a1743`

## Evidence

The current Node path is `VisionObservation` (`PerceivedItem`) → `normalize` →
retrieval/resolution → `portion.estimate` → `ResolvedItem`/`MealLog` → mobile
API types and screens. `normalize` already parses numeric and word quantities
from `portion_hint`, and `portion.estimate` already multiplies grams by that
quantity. The loss was after resolution: `runner.ts` passed normalized quantity
and unit to portion estimation but did not retain either field on the resolved
item, so the response and mobile UI could not show the evidence.

The Gemini boundary has only the existing free-form `portion_hint`, documented
as a non-numeric serving description; it has no dedicated count field. No
provider prompt or adapter change was made. A live image therefore still cannot
be claimed to contain a reliable count unless the provider supplies explicit
quantity evidence. An uncountable hint remains `quantity: null` and is routed to
review; this change does not infer a count from pixels or from grams.

## Reproducible before/after replay

On clean `origin/main` (`07b0945`), the text-level stub input with `two pieces`
for simit and `one serving` for ayran produced:

- `tr.simit`: 200 g, p10 150 g, p90 270 g, 658 kcal
- `tr.ayran`: 200 g, p10 150 g, p90 270 g, 74 kcal
- meal total: 732 kcal, action `review`
- response fields: no quantity or unit

The same clean-base replay with `several` for simit produced 100 g, p10 65 g,
p90 145 g, 329 kcal, and action `ask`; the response had no quantity or unit.

On this branch, the focused runner test reproduces the first replay with
`quantity: 2, unit: "pieces"` for simit and `quantity: 1, unit: "serving"` for
ayran, with the same grams, bands, nutrients, total, and `review` action. The
`several` replay retains `quantity: null, unit: "several"`, the same grams and
band, and now routes to `review`. Identity confidence remains the existing
`confidence` field; quantity evidence is separate metadata, and portion
uncertainty remains the existing p10–p90 interval.

## Changes

- Preserve normalized quantity/unit on each Node `ResolvedItem` and therefore
  in the `MealLog` response.
- Route a grounded V3 meal containing an unknown quantity to `review` without
  changing the existing confidence thresholds or portion calculations.
- Show known quantity and unknown-quantity review text in Review, its audit
  panel, and Day meal titles, with Turkish and English dictionary entries.
- Add focused Node and mobile regression assertions.

## Verification

- `server`: build, lint, and 167 Vitest tests passed.
- `apps/mobile`: tests and TypeScript typecheck passed.
- `make check` in a throwaway virtualenv: 261 Python tests passed; invariants,
  status, and the V0–V3 regression guard passed.
- `git diff --check` passed.

Traps: the provider boundary still does not establish a reliable image count;
the safe result for absent evidence is an explicit unknown plus review.
