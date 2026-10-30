# TypeScript portion gate after catalogue merge

Issue #181, PR #184, agent `codex5`.

## Rebase and measurement basis

PR #158 merged at `95bc0be`. The portion-gate commit was rebased normally onto
that `origin/main` and is now `2a42eee`. The final `en_US` pack has 38 foods;
the golden manifest still has 80 recorded fixtures.

The before row below was measured from a detached clean `origin/main` checkout
at `95bc0be`; the after row was measured from the rebased TypeScript branch.
Both were built with `npm run build`, replayed through the Node
`FixtureVision` adapter and V3 runner, and scored with the same covered-row and
complete-positive-calorie denominator used by `eval/metrics.py`. No evaluator,
golden label, baseline, threshold, Python confidence, or mobile file changed.

| Node V3 replay | Auto-accept | Review | Ask | Covered | Coverage | Complete calorie rows | MAPE | Item F1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Before: final catalogue, identity-only router | 10 | 2 | 68 | 12/80 | 15.00% | 2 | 12.686567% | 0.154882 |
| After: final catalogue, interval-aware router | 1 | 3 | 76 | 4/80 | 5.00% | 1 | 0.000000% | 0.154882 |

The F1 counts are `TP=23`, `FP=141`, `FN=110` in both rows; the gate changes
routing only. The newly withheld complete-truth row remains `n5k_0002` at
25.373134% calorie/portion error; `pkg_0001` is the retained complete row at
0.000000%. The complete-calorie denominator is therefore two rows before and
one after, and the reduction in MAPE must be read with the 15% to 5% coverage
change.

The current official Python evaluator, rerun unchanged against the final
catalogue, reports V3 worst/mean MAPE `12.7%`, coverage `15%`, item F1 `0.15`,
and FP rate `86.0%`; this is a catalogue refresh result, not a semantic change
to the evaluator or Python confidence path.

## Ayran provenance and confidence separation

The replay of `tr_0003` still returns the exact observed result:

- `food_id=tr.ayran`, `grams=200`, `grams_p10=150`, `grams_p90=270`;
- `portion_source=catalogue_default_scaled`;
- `portion_provenance=fallback=catalogue.default_serving_g=200; quantity=1; unit=unknown`;
- identity `confidence=1.0`, separate portion confidence `0.400`;
- V3 action changes from `auto_accept` to `review`.

The recorded observation is `portion_hint: "1 serving"`; it contains no 270 ml
evidence. The pipeline therefore never hardcodes or derives 270 g from the
photo claim. The LLM observation still contains no grams or nutrient fields;
nutrition remains a deterministic catalogue calculation.

## Verification

- `PATH=/private/tmp/mealog-codex5-portion-IFteXN/bin:$PATH make check` — passed: 261 Python tests, Ruff, invariants, current STATUS, and regression guard.
- `cd server && npm run build` — passed.
- `cd server && npm run lint` — passed.
- `cd server && npm test -- --reporter=dot` — passed: 13 files, 164 tests.
- `python eval/harness.py --configs V0,V1,V2,V3` — rerun against the final catalogue and 80 fixtures.
- `python eval/harness.py --configs V0,V1,V2,V3 --check-regression` — passed.
- `python scripts/check_invariants.py` — passed.
- `python scripts/status.py --check` and `make status` — passed.
- `git diff --check` — passed.

Traps: do not reuse the pre-#158 PR numbers; the final catalogue changes the
baseline to 12/80 covered and F1 0.154882. Do not tune thresholds or edit the
evaluator, golden labels, baseline, Python confidence, or mobile files to make
the 5% operating point look better.
