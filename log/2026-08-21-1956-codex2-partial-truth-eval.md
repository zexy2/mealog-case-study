# Issue #168 — partial-truth calorie eligibility

Agent: `codex2`  
Claim: #168  
Branch: `agent/codex2/partial-truth-eval`  
Base: `f465655` (`origin/main`)

## Change

- Added manifest-driven `calorie_truth_complete()` in `eval/harness.py`; a
  non-empty `unmapped_source_ingredients` list marks the row incomplete.
- Added `SampleResult.calorie_eligible`, `Bucket.calorie_eligible`, and explicit
  calorie eligible/scored columns to the generated cuisine/tier scorecards.
- Partial rows retain their mapped calorie total for inspection, but `ape` is
  undefined for them; identity metrics, coverage, FP rate, and error tags still
  aggregate normally.
- Regression checking compares only non-empty eligible calorie buckets and
  treats an empty denominator as unsafe to compare, never as an improvement.
- Documented complete/partial/zero/empty truth and denominator semantics.

## Decisive fixture evidence

`n5k_0010` has only `us.rice_white_cooked` in `truth.items`; pork, tofu, pepper,
bok choy, garlic, soy sauce, salt, and sugar remain in
`unmapped_source_ingredients`.

On the isolated PR #158 catalogue branch, the old harness treated the row as
covered: mapped truth was **7.1 kcal**, prediction **598.8 kcal**, APE
**8333.8%**, and V3 had **10** calorie APEs with **1211.5%** mean MAPE. With
the fixed evaluator against the same runtime and fixtures, the row remains
covered and has the same identity counts (`TP=1`, `FP=4`, `FN=0`), but
`calorie_eligible=false`, `ape=None`, and V3 has **2** eligible/scored rows at
**12.7%** mean MAPE. No calorie was changed to zero.

## Scorecard replay

Current `origin/main` before/after evaluator metric values are unchanged:

| Config | Worst MAPE | Mean MAPE | Coverage | Item F1 | FP rate | Calorie eligible/scored after |
|---|---:|---:|---:|---:|---:|---:|
| V0 | 100.0% / 100.0% | 100.0% / 100.0% | 100% / 100% | 0.00 / 0.00 | 100.0% / 100.0% | 2 / 2 |
| V1 | 12.7% / 12.7% | 12.7% / 12.7% | 8% / 8% | 0.35 / 0.35 | 49.3% / 49.3% | 2 / 2 |
| V2 | 12.7% / 12.7% | 12.7% / 12.7% | 8% / 8% | 0.35 / 0.35 | 49.3% / 49.3% | 2 / 2 |
| V3 | 12.7% / 12.7% | 12.7% / 12.7% | 6% / 6% | 0.32 / 0.32 | 47.5% / 47.5% | 2 / 2 |

Baseline was not modified: `eval/reports/baseline.json` SHA-256 is
`a95e4d1ff2b2d2f377aeaafe0c89d0eb007638af09f7324d237f50adb30da8e6`.

## Verification

- Throwaway venv: `/tmp/mealog-codex2-partial-truth-venv`.
- Focused evaluator tests: **6 passed**.
- `make check`: Ruff passed; **255 tests passed**; invariants passed; STATUS
  matched; regression guard passed.
- Fresh `make eval` replay generated the after scorecard from current main.
- `git diff --check` passed.

Traps: `truth.items` is not automatically complete meal truth. Never make
partial truth safe by setting its calories to zero, blocking valid resolution,
removing it from identity metrics, or treating an empty MAPE denominator as
0.0% accuracy. Keep PR #158's catalogue files and PR #39's confidence work
separate; this branch changes only the evaluator, focused test, docs, and log.
