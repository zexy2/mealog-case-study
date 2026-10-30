# Evaluation refresh takeover — current 80-sample evidence

Agent: `codex4`
Claim: [#176](https://github.com/zexy2/mealog-case-study/issues/176)
Takeover: prior `claude`/`gumball` attempt; no #176 branch, commit, PR, or
log existed when checked
Branch: `agent/codex4/evaluation-refresh-80`
Base: `29d0ff1` (`origin/main`)

## Change

- Reconstructed the current evaluation from `eval/harness.py`, `eval/metrics.py`,
  `eval/decompose_real_error.py`, the manifest, and the recorded fixtures.
- Refreshed `docs/evaluation.md` from superseded n=25/n=20 prose to the current
  n=80 ablation, V3 cuisine/tier slices, error tags, deferred-meal blocker
  decomposition, and the two-row calorie decomposition supported by the
  current denominator.
- Kept `eval/reports/baseline.json` unchanged. No `eval/golden/`, evaluator,
  pipeline, label, scoring, regression-guard, mobile, or confidence files were
  changed.

## Current evidence

- Manifest: 80 rows; cuisine counts western 12, mediterranean 12, east_asian
  16, other_mixed 8, south_asian 16, latin_american 16.
- Overall tiers: tier_1 74, tier_2 1, tier_3 5.
- 72 rows have `unmapped_source_ingredients` and remain outside calorie
  eligibility; only `n5k_0002` and `pkg_0001` are complete, positive-truth
  rows. No partial-truth row is covered by the current V3 run.
- V3: 6% coverage (5/80), 12.7% MAPE over 2 calorie-scored rows, Item F1
  0.32, FP rate 47.5%; 75/80 rows ask for clarification.
- V3 tags: E3=25, E4=68, E7=16, E12=75, unclassified=72; the other eight
  error codes are zero. Tags overlap.
- Deferred V3 blocker counts: 61 catalogue-only, 13 mixed
  catalogue-plus-threshold, 0 threshold-only, 1 empty.
- Retrieval replay: 145 variants, current coverage retriever Recall@1 and
  Recall@5 100.0%, MRR 1.000, Accept@1 99.2%, 0/22 false accepts.
- `decompose_real_error.py` replayed all 80 rows, but its detailed mapped
  calories are not complete meal truth for partial rows. Its only two scored
  APE rows are the same two current harness denominator rows; the document
  states that limitation instead of presenting the full table as calorie truth.

## Verification

Throwaway environment: `/tmp/mealog-codex4-evaluation-venv.v7KudG`.

- `make check` — Ruff passed; 255 tests passed; invariants passed; STATUS check
  passed; V3 regression guard passed.
- Harness scorecard replay and `--check-regression` passed.
- Retrieval evaluation and decomposition replay passed.
- Scorecard hash before/after docs-only change:
  `ad0c0d95c08e7ad899520617009dec22be2d81597a85e65222a704b4093fa417`.
- Baseline SHA-256 before/after: unchanged at
  `a95e4d1ff2b2d2f377aeaafe0c89d0eb007638af09f7324d237f50adb30da8e6`.
- `git diff --check` passed; only `docs/evaluation.md` is in the source diff.

Traps: The old claim proposed resetting the baseline, but the current task
forbids baseline changes; do not reset it to make the refreshed document look
approved. The 80-row decomposition script displays mapped truth for many
partial rows and does not itself carry the harness eligibility flag. Only its
two covered complete rows support calorie APE/MAPE here; never promote a
mapped partial total into meal truth or a calorie denominator.
