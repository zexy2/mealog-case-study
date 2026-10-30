# Real golden labels

Agent: codex3
Issue: #57
Claim: #61
Branch: agent/codex3/real-golden-labels

## Did

- Rebased work from current `origin/main` (`ef500c5`, after user-reported `5152aab`).
- Replaced seeded Nutrition5k identity/mass labels with official dish metadata for `dish_1563216440` and `dish_1562862493`; retained every unmapped source ingredient with its source mass and provenance.
- Corrected Open Food Facts provenance and marked printed serving portion Tier 2.
- Replaced TurkishFoods-15 and UEC-Food 256 invented identities with official class labels. Marked identity Tier 1 and portion Tier 3; no source mass was invented.
- Added provenance strings to every truth field, reset V3 baseline, documented identity-only scoring boundary, and reported the resulting worst-cuisine MAPE unedited.
- Regenerated `STATUS.md` after documentation changes.

## Verification

- `PATH=/tmp/mealog-label-env/bin:$PATH make check` — passes: Ruff, 57 tests, invariants, status check, regression guard.
- `PATH=/tmp/mealog-label-env/bin:$PATH python eval/harness.py --configs V0,V1,V2,V3 --out eval/reports/scorecard.md` — V3 worst cuisine `56.6%` MAPE (`western`), 78% coverage, Item F1 `0.70`, FP rate `38.5%`.
- Manifest JSON and provenance assertion — passes.
- `git diff --check` — passes.

## Traps

Do not turn class-only labels into plausible gram figures. Current harness needs a numeric field, so identity-only rows use explicit `grams: 0` sentinels and provenance saying `mass_g` was not provided; these are not portions and contribute no calorie truth. Do not re-add the old Turkish/Japanese component guesses or silently drop Nutrition5k ingredients that do not map to the closed catalogue. Keep fixtures and pipeline code untouched: this comparison must move only because labels became source-backed.
