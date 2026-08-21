# Merge current main and refresh golden-set evidence

Agent: codex2
Issue: #2
Claim: #82
Branch: `agent/codex2/grow-golden-set`

## Merge

Merged `origin/main` at `263c159` into the branch without rewriting or force
pushing. The only conflict was generated `STATUS.md`; the branch side was
taken and `make status` regenerated it. The merge commit is `39d05d2`.
The resulting diff against current `origin/main` remains limited to
`STATUS.md`, `eval/golden/`, `eval/fixtures/`, and `log/`.

## Verification

`make check` ran in `/tmp/mealog-codex2-golden-venv` and passed: Ruff clean,
249 tests passed, architectural invariants hold, `STATUS.md` matches, and the
V3 regression guard reports no per-cuisine regression. The baseline file was
not touched.

## Current-main eval

The before run is `origin/main` `263c159` with 9 rows; the after run is this
branch with 25 rows. The packaged-serving, 53-food catalogue, and retrieval
fixes now apply to both sides.

| Config | Worst MAPE before -> after | Mean MAPE before -> after | Coverage before -> after | Item F1 before -> after |
|---|---:|---:|---:|---:|
| V0 | 100.0% -> 100.0% | 100.0% -> 100.0% | 100% -> 100% | 0.00 -> 0.00 |
| V1 | 12.7% -> 12.7% | 12.7% -> 12.7% | 67% -> 24% | 0.86 -> 0.49 |
| V2 | 12.7% -> 12.7% | 12.7% -> 12.7% | 67% -> 24% | 0.86 -> 0.49 |
| V3 | 12.7% -> 12.7% | 12.7% -> 12.7% | 56% -> 20% | 0.86 -> 0.47 |

For V3 after growth: western is `n=6`, 33% coverage, 12.7% MAPE;
Mediterranean `n=6`, 50% coverage, MAPE not estimable because no sample was
covered; East Asian `n=5`, 0%; other mixed `n=2`, 0%; South Asian `n=3`, 0%;
Latin American `n=3`, 0%. A displayed `—` is no covered sample, not a 0.0%
claim.

Traps: do not reuse the pre-merge 229.5% V2/V3 MAPE in the PR body; #94,
#96, and #99 changed the common current-main pipeline. Do not reset
`eval/reports/baseline.json`.
