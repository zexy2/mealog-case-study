# Issue #78 — real error decomposition

Agent: `codex`
Branch: `agent/codex/error-decomposition`
Base: `origin/main` at `1b245e8`

## Done

- Added `eval/decompose_real_error.py`, an offline fixture-only analysis that
  emits all nine provider/retrieval/resolution/portion/truth/kcal/APE/E-code
  rows, the scored APE distribution, and the two aligned counterfactuals.
- Documented the decomposition in `docs/evaluation.md`.
- Changed empty `Bucket.mape` and `Bucket.within_20pct` values to render as an
  em dash while retaining numeric zero for regression and JSON compatibility.

## Findings

- The `229.49%` western headline is `n=2`, not a nine-sample mean.
- `pkg_0001` is 433.6% APE and 94.5% of summed scored APE; `n5k_0002` is 25.4%.
- Identity-perfect/observed-grams MAPE is 229.49%; perfect-grams/observed-
  identity MAPE is 0.00%, both on `n=2` exact-alignment rows.
- No covered positive-calorie row has an identity mismatch. Five rows are
  identity-only truth, so they cannot support an identity-only calorie MAPE.
- The former three `0.0%` cuisine cells were not real accuracy results:
  Mediterranean had coverage but zero positive-truth calorie rows; East Asian
  and other-mixed had zero coverage.

## Verification

`make check` passed in a throwaway environment: 91 tests, ruff, architectural
invariants, STATUS consistency, and V3 regression guard. The analysis output
was regenerated twice and matched byte-for-byte.

Traps: `grams: 0` in the manifest is an identity-only evaluator sentinel, not
measured zero mass. Do not put those rows into calorie MAPE or use their
provider kcal as calorie error. Do not replace the em dash with numeric zero;
the numeric compatibility is intentional for the existing regression JSON.
