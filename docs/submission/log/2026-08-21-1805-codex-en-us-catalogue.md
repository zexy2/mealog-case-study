# Issue #147 — grow the en_US catalogue

Agent: `codex`
Issue: #147
Claim: #150
Branch: `agent/codex/en-us-catalogue`
Base: `a8bf11d` (`origin/main`)

## Change

- Added 30 targeted canonical foods to `locale_packs/en_US/foods.jsonl`, drawn
  only from the deferred provider names in `docs/evaluation.md`.
- Every added nutrient row was checked against the USDA FoodData Central SR
  Legacy JSON release, with its FDC ID and official dataset URL in `source`.
- Added USDA serving-basis densities wherever the record supplied a cup or
  half-cup mass; piece/ounce foods retain mass servings without an invented
  volume density.
- Added realistic aliases and negative aliases for the new ambiguities. The
  new `chicken`, `meat`, `rice with meat`, `biryani`, `fish`, salad variants,
  `polenta`, and `tortilla de patatas` traps all abstain. `unicorn casserole`
  was also recorded as a negative alias for the new corn entry after the
  baseline matcher surfaced it as a false accept.
- Regenerated `STATUS.md`: en_US is 38 foods and the three packs total 99.

## Evaluation

Retrieval baseline is the current `origin/main` catalogue; the blended row is
the same implementation before and after the en_US growth.

| Retrieval row | Before | After |
|---|---:|---:|
| Recall@1 | 100.0% | 100.0% |
| Recall@5 | 100.0% | 100.0% |
| MRR | 1.000 | 1.000 |
| Accept@1 | 99.2% | 99.2% |
| blended false accepts | 0/22 | 0/22 |
| known confusion cases | all pass | all pass |

The 145-variant set remains 122 positive inputs plus 23 negative/confusion
cases. The token-overlap comparison row changed from 0/22 to 1/22 because
`unicorn casserole` now contains the new `corn` surface; blended retrieval
still rejects it, and the negative alias documents the trap.

The end-to-end V3 replay changes because the current 25-row manifest has
partial truth for many deferred photos and cannot be edited in this issue:

| V3 metric | Before | After |
|---|---:|---:|
| Coverage | 20% | 52% |
| Worst-cuisine MAPE | 12.7% (western) | 8333.8% (east_asian) |
| Mean MAPE | 12.7% | 1211.5% |
| Item F1 | 0.47 | 0.23 |

Coverage by cuisine is western `33% -> 83%`, mediterranean `50% -> 83%`,
east_asian `0% -> 20%`, south_asian `0% -> 33%`, latin_american `0% -> 33%`,
and other_mixed `0% -> 0%`. The stored regression guard therefore correctly
fails on the current partial-label baseline; no threshold, metric, truth label,
or baseline was changed to hide that effect. The follow-up label/measurement
refresh must separate coverage gained from unsupported calorie claims.

## Verification

Throwaway environment: `/tmp/mealog-codex147.UTTTIM/venv`.

- USDA JSON cross-check: 30/30 added rows matched FDC nutrient fields.
- `make test`: 249 passed.
- `make lint`: passed.
- `python scripts/check_invariants.py`: passed.
- `python scripts/status.py --check`: passed.
- `python eval/retrieval_eval.py`: passed, 145 variants.
- `python eval/harness.py --check-regression`: expected failure because the
  current catalogue additions make previously unlabelled foods count as
  predictions; output is recorded above rather than called green.
- `git diff --check`: passed.

Traps: A catalogue expansion can improve retrieval coverage while making a
partial-label calorie score look catastrophically worse; do not reset the
baseline or edit truth labels inside this catalogue issue. The generic
`chicken`, `meat`, and composite-meal forms need negative aliases or they will
be accepted through the nearest new canonical name. The baseline retrieval
implementation ignores negative aliases, so report its new false accept
separately from the blended runtime result.
