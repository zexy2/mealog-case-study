# TypeScript portion uncertainty audit

Issue #181, agent `codex5`.

## Provenance

The exact `200 g` / `150–270 g` result is reproduced by recorded fixture
`eval/fixtures/tr_0003.json`. That fixture is the committed `tr_0003` text lane
(the manifest marks it `input_type: text`, not a photo); it contains the provider
observation `surface_form: "ayran"` and `portion_hint: "1 serving"` with
identity confidence `1.0`. Turkish normalization parses quantity `1` and the
unit token `serving`, which is not in `locale_packs/tr/units.jsonl`; the
catalogue row supplies `default_serving_g=200`, so the deterministic fallback
returns `grams=200`, `grams_p10=150`, `grams_p90=270` and
`portion_provenance=fallback=catalogue.default_serving_g=200; quantity=1; unit=unknown`.
No recorded provider observation supplies `270 ml`, so no `270 g` conversion is
made or justified.

## Runtime decision

The TypeScript router now computes the D11 portion signal from the deterministic
interval and routes on the weaker of identity confidence and portion confidence.
It does not overwrite `ResolvedItem.confidence`, which remains the identity
confidence shown by the pipeline. A malformed interval fails closed; the
existing `AUTO_ACCEPT=0.75` and `ASK_BELOW=0.40` thresholds are unchanged.

For the recorded ayran result, portion confidence is `0.400`, identity
confidence remains `1.000`, and V3 changes from `auto_accept` to `review`.
The wide `jp_0001` unknown-density band has portion confidence `0.000` and
cannot auto-accept (that row already asks because it also contains abstentions).
Nutrition remains deterministic and catalogue-derived; the vision observation
type still has no grams or nutrient fields.

## Real-fixture risk and coverage

The same 80 recorded fixtures were replayed through the Node V3 runner before
and after the router change. The before run is the clean `origin/main` at
`29d0ff1`; the after run is this branch. Coverage means a row with no ask and no
abstention. Calorie MAPE is over covered rows with complete positive calorie
truth, matching `eval/metrics.py`; only two rows have that denominator on this
manifest.

| Node V3 replay | Auto-accept | Review | Ask | Covered | Coverage | Complete calorie rows | Covered calorie MAPE |
|---|---:|---:|---:|---:|---:|---:|---:|
| Before: identity-only routing | 5 | 0 | 75 | 5/80 | 6.25% | 2 | 12.69% |
| After: interval-aware routing | 1 | 2 | 77 | 3/80 | 3.75% | 1 | 0.00% |

The two newly withheld rows are `n5k_0002` (the one newly withheld complete
truth row, `25.37%` calorie/portion error) and `tr_0002` (portion truth is the
manifest's non-scoring zero sentinel). The retained complete row is `pkg_0001`
at `0.00%` error; this is the real-fixture selectivity D11 requires, with the
explicit caveat that the complete-calorie denominator is only two rows.

The current Python evaluator was also rerun unchanged: V3 remains `12.7%`
worst/mean MAPE, `6%` coverage, `0.32` item F1, and `47.5%` FP rate over the
same 80-row manifest. The Python evaluator and its confidence module were not
modified in this Node-only claim.

## Verification

- `PATH=/private/tmp/mealog-codex5-portion-IFteXN/bin:$PATH make check` — passed: 255 Python tests, Ruff, invariants, current STATUS, and regression guard.
- `cd server && npm run build` — passed.
- `cd server && npm run lint` — passed.
- `cd server && npm test -- --reporter=dot` — passed: 13 files, 164 tests.
- `python eval/harness.py --configs V0,V1,V2,V3` — rerun against recorded fixtures.
- `python eval/harness.py --configs V0,V1,V2,V3 --check-regression` — passed.
- `python scripts/check_invariants.py` — passed.
- `python scripts/status.py --check` — passed.
- `git diff --check` — passed.

Traps: do not replace the interval with a photo-derived `270 g`; only explicit
quantity/unit evidence plus sourced density can justify that conversion. Do not
merge this TypeScript gate by editing Python `confidence.py`, the evaluator,
golden labels, baseline, or mobile code; those remain outside this claim.
