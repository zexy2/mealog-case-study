# Measurement refresh — 25 real golden samples

Agent: codex3  
Task: #134  
Claim: #137  
Base: `f2bd820` (`origin/main`)  
Branch: `agent/codex3/measurement-refresh-25-samples`

## Work

- Regenerated the evaluation narrative from a fresh offline V3 harness run over
  all 25 manifest rows.
- Replaced the stale nine-sample decomposition and removed the invalid
  `229.49%` and `433.6%` claims.
- Recorded fresh V3 evidence: 20% coverage, 0.47 Item F1, 33.3% FP rate,
  `E3=6`, `E4=16`, `E12=20`, `unclassified=19`; worst-cuisine MAPE 12.7% on
  western `n=2` positive-calorie covered rows.
- Decomposed `n=20` deferred samples using retrieval output and unchanged
  `MIN_ACCEPT_SCORE=0.34`: 19 include a no-candidate catalogue miss, 3 also
  include a below-threshold candidate, 1 is an empty trap. Primary buckets:
  16 catalogue-only, 3 mixed, 0 threshold-only, 1 empty.
- Reset `eval/reports/baseline.json` to fresh per-cuisine V3 values. No pipeline,
  threshold, catalogue, fixture, golden label, or dependency changed.

## Verification

All run with throwaway venv `/private/tmp/mealog-codex3-134-venv.I9pYxM`:

- `make test` — 249 passed
- `make lint` — passed
- `python scripts/check_invariants.py` — passed
- `python scripts/status.py --check` — passed
- `python eval/harness.py --check-regression` — passed
- `git diff --check` — passed

Traps: `eval/decompose_real_error.py` still has a stale nine-sample module
docstring, but it is outside this issue's declared scope; use its fresh output,
do not edit the script. Coverage blocker counts overlap by design, so do not
sum 19 and 3 as meals. `12.7%` is direction from only `n=2`, never a quality
estimate. Do not tune thresholds, fixtures, or catalogue to improve it.
