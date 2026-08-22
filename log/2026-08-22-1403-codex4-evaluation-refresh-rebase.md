# Evaluation refresh resume after catalogue merge

Agent: `codex4`
Claim: [#176](https://github.com/zexy2/mealog-case-study/issues/176)
PR: [#185](https://github.com/zexy2/mealog-case-study/pull/185)
Handover: resumed the existing evaluation-refresh PR after the catalogue merge
at `95bc0be`; no new PR or claim was opened.
Branch: `agent/codex4/evaluation-refresh-80`

## Integration

The published PR branch pointed at `9cfcbc7`, while current `origin/main` was
`95bc0be`. AGENTS.md forbids rewriting a published branch and force-pushing,
so I integrated main with the fast-forward-safe merge commit `9050f9a` rather
than rewriting the PR history. The PR diff remains limited to the declared
documentation and log scope.

## Evidence

All replay commands used the committed 80-row manifest and recorded fixtures.
The post-catalogue scorecard was generated with
`python eval/harness.py --configs V0,V1,V2,V3 --out eval/reports/scorecard.md`.

| Evidence | Before catalogue merge | After catalogue merge |
|---|---:|---:|
| Scorecard SHA-256 | `ad0c0d95c08e7ad899520617009dec22be2d81597a85e65222a704b4093fa417` | `bfb1703b317b2f7f075898606e3e8de21cbc5f986a9bbcb39d9625b06107a65e` |
| V1 coverage / Item F1 / FP rate | 8% / 0.35 / 49.3% | 49% / 0.13 / 89.8% |
| V2 coverage / Item F1 / FP rate | 8% / 0.35 / 49.3% | 49% / 0.13 / 89.8% |
| V3 coverage / Item F1 / FP rate | 6% / 0.32 / 47.5% | 15% / 0.15 / 86.0% |
| V3 worst-cuisine MAPE / calorie scored | 12.7% / 2 | 12.7% / 2 |
| Baseline SHA-256 | `a95e4d1ff2b2d2f377aeaafe0c89d0eb007638af09f7324d237f50adb30da8e6` | unchanged |

The current V3 replay commits 12/80 meals and asks on 68/80. Its cuisine and
tier slices, observable error tags, and blocker decomposition are documented
in `docs/evaluation.md`: E3=61, E4=69, E7=11, E12=68, and
`unclassified`=74; deferred rows have 41 catalogue-miss evidence, 57 weak-
candidate evidence, and mutually exclusive primary buckets of 10 catalogue-
only, 31 mixed, 26 threshold-only, and 1 empty.

The harness has two complete positive-truth calorie rows (`n5k_0002` and
`pkg_0001`). The decomposition helper maps seven additional covered
partial-truth rows (`n5k_0003`, `n5k_0004`, `n5k_0005`, `n5k_0006`,
`n5k_0010`, `n5k_0016`, `n5k_0058`), but those mapped totals are diagnostic and
are excluded from calorie MAPE and within-20% metrics.

## Gates

- `make check`: pass — Ruff, 261 tests, invariants, STATUS check, and no
  per-cuisine V3 regression.
- `python scripts/status.py --check`: pass — STATUS matches the repository.
- `git diff --check`: pass.
- Hosted CI: pending after this push; CI remains the authority.

## Traps

- Do not reset `eval/reports/baseline.json` or alter evaluator semantics.
- Do not treat `decompose_real_error.py`'s seven partial-row mapped APEs as
  calorie metrics; partial truth remains outside the denominator.
- Do not force-push the already published PR branch.
