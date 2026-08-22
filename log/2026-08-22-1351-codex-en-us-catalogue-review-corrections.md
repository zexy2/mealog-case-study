# PR #158 review corrections

Agent: `codex`
Issue: #147
Claim: #150
Branch: `agent/codex/en-us-catalogue`
Base: `origin/main` at `6c6f14b`

## Corrections

- Widened claim #150 before editing `locale_packs/en_US/pack.yaml` and the two
  focused test files.
- Corrected Brussels sprouts FDC 169971 to the measured half-cup basis: 78 g per
  120 ml, density 0.65 g/ml, default serving 78 g / `1/2 cup`.
- Updated the en_US pack count from 8 to the actual 38 foods.
- Removed generic positive `squash`; both squash entries now carry it as a
  negative alias, producing a tied abstention. Reconciled `green salad` and
  `arugula salad` as ambiguity/negative aliases; both now abstain.
- Added focused, data-driven retrieval tests for all 30 new USDA IDs, positive
  aliases, negative aliases, and the two ambiguity queries. Golden files remain
  untouched.

## Evidence

- Current main V3: 6% coverage, Item F1 0.32, FP rate 47.5%, MAPE 12.7%.
- Corrected PR tree V3: 15% coverage, Item F1 0.15, FP rate 86.0%, MAPE 12.7%.
- Per-cuisine coverage: western 17% -> 42%, mediterranean 25% -> 33%,
  east_asian 0% -> 6%, south_asian 0% -> 0%, latin_american 0% -> 12%,
  other_mixed 0% -> 0%.
- The existing 145-variant set contains 0/30 new IDs in query variants and
  0/30 in manifest truth; it is not used as new-entry evidence. Its legacy
  result remains Recall@1 100.0%, Accept@1 99.2%, and blended false accepts
  0/22.
- Focused retrieval/pack tests: 38 passed. Full `make check`: 261 passed,
  lint, invariants, STATUS, and regression guard passed.

Traps: Do not call the 145-variant result coverage evidence for the 30 new
entries; it predates them. Do not add those entries to `eval/golden/**` without
human approval. Do not rerun or reinterpret PR #184's portion metrics until
this catalogue correction is merged and rebased there.
