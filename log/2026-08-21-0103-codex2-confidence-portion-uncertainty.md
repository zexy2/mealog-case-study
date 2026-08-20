# Confidence gate reads portion uncertainty

Issue #5, agent `codex2`.

## Change

- Added a bounded portion-confidence signal from `ResolvedItem.grams_p10`,
  `grams`, and `grams_p90`.
- `confidence.route()` now stores the weaker of retrieval confidence and
  portion confidence before applying the existing thresholds.
- Invalid or non-finite percentile intervals fail closed.
- Added focused tests for wide-band ask, narrow-band acceptance, retrieval
  uncertainty, and missing interval data.

## Eval impact

Using the nine-sample manifest from `origin/main` (the working manifest is an
uncommitted parallel-agent change):

| Gate | Covered | Coverage |
|---|---:|---:|
| Before: retrieval-only | 7/9 | 78% |
| After: actual p10/p90 | 4/9 | 44% |
| Counterfactual: volume density known | 7/9 | 78% |

The 34-point drop is attributable to density ignorance for `n5k_0001`,
`tr_0001`, and `jp_0001`, all of which contain volume portions. The seeded set
shows no additional coverage loss from identity/model uncertainty: the
density-known counterfactual matches retrieval-only coverage. No threshold or
`eval/reports/baseline.json` change was made.

## Verification

- Scoped Ruff: passed.
- Focused confidence tests: 4 passed.
- Full pytest in the shared tree: 45 passed.
- Architectural invariants: passed.
- Full `make check` could not start its eval gate because an untracked parallel
  agent test (`server/tests/test_golden_manifest.py`) fails the repository Ruff
  import-order check. That file and the parallel golden manifest changes were
  left untouched.

Traps: do not tune thresholds to recover the 34-point drop; all current volume
units intentionally use `UNKNOWN_DENSITY_SPREAD`, so their portion signal is
zero and they should ask. Do not stage the parallel agent's golden-manifest,
runner, or image-fetch changes, and do not reset the baseline report.
