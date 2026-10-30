## 2026-08-21 01:05 +03 — codex4

Issue:   #20; claim #33
Branch:  `agent/codex4/error-taxonomy`
Did:     Added observable error tagging for E3, E4, E7 and E12, with V0's
         ungrounded identity axis excluded and human-causal mismatches kept as
         `unclassified`. Added per-tier aggregation and scorecard sections,
         error distributions, and fixed `metrics.spread()` so a zero-MAPE
         bucket yields an infinite spread when another bucket has error.
         Added focused taxonomy, tier, and spread regressions.
Result:  31 tests passed; Ruff passed for the CI scope (`src tests ../scripts`);
         invariants, generated STATUS check, and V3 regression guard passed.
         Existing V0/V1/V2/V3 MAPE, coverage, F1 and FP rows stayed unchanged.
         Spread before/after: V0 1.96/1.96, V1 1.44/inf, V2 4.20/inf,
         V3 1.00/inf. No dependency changes.
Next:    Open the PR, read its CI result, and comment on #20 after the change
         merges.
Traps:   `STATUS.md` is always-allowed generated output, so adding the new test
         file makes `status.py --check` fail until STATUS.md is regenerated;
         do not hand-edit it. The old spread filter dropped zero-MAPE buckets;
         simply removing the filter would divide by zero, so represent a
         nonzero-versus-zero spread as `float("inf")`. Do not infer E1/E2/E5/E6/
         E8/E9/E10/E11 from aggregate IDs or calories; keep those observations
         `unclassified`.
