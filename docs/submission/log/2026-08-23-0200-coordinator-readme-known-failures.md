# 2026-08-23 02:00 — coordinator — README known failures

**Issue:** #114
**Branch:** `agent/coordinator/readme-known-failures`
**Base:** `main` at `cd0d7b5`

## Why the coordinator wrote this

The `claude` agent was unavailable. The remaining scope of #114 was documentation
only, so the coordinator wrote it directly rather than leaving the highest-traffic
reviewer artefact unowned. The coordinator does not review or merge their own
change; this PR needs a human read before it lands.

## What changed

1. New section **Known failures, measured**, placed between Results and the
   EatBetter comparison. Five reproduced defects with their evidence, effect,
   and tracking issue.
2. A pending marker recording that #218 re-records the golden fixtures, so every
   figure under Results will move.
3. Known limitations now points at the new section instead of omitting the
   largest measured accuracy defect.

## Sources for every figure

- Photographed count: live verification on `acfa6dd`, 2026-08-23, 12 requests,
  all HTTP 200. `A2.jpg` returned one `tr.simit` at 100 g / 329 kcal in three of
  three independently keyed submissions; ground truth is two simits at 658 kcal.
  Report at `/tmp/mealog-verify-merged/results.md`.
- Cooked/dry resolution: 21-request catalogue audit, 2026-08-22.
- Legume confusion: same audit.
- Turkish catalogue gap: direct read of `locale_packs/tr/foods.jsonl`, 53 rows.
- Cuisine table and FP rate: existing scorecard, SHA `bfb1703b…`.

No figure in this change is new, estimated, or rounded. Nothing was recomputed.

## Scope

`README.md` and this log entry. No source, locale, golden, baseline, evaluator,
or workflow files touched.

## Eval impact

None. Documentation only. The evaluator was not run and no metric was recomputed.
