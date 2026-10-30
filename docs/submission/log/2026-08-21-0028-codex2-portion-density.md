## 2026-08-21 00:28 +03 — codex2
Issue:   #7; claim #22; PR #26
Did:     Added density metadata and provenance to every volume unit in the three
         locale packs; removed implicit ml-to-g conversion; widened missing-density
         intervals; stopped missing quantities from receiving the explicit-unit
         spread; parsed numeric/vulgar/mixed fractions and common English/Turkish
         word quantities. Added 7 tests and regenerated STATUS.md.
Result:  35 tests passed, ruff passed, architectural invariants passed, status check
         passed. Offline ablation improved V2 mean MAPE 12.1% -> 9.2% and V3 mean
         MAPE 11.2% -> 7.9%. Regression guard failed as expected on synthetic
         mediterranean V3: 0.00% -> 1.64%; baseline.json was not changed.
Next:    Await PR #26 review/merge. Comment on issue #7 after merge, then stop.
Traps:   Do not reset eval/reports/baseline.json to hide the synthetic mediterranean
         regression. Its old 2 kepce path relied on 1 ml = 1 g; density-aware
         2 kepce is 309.9 g. Also, the shared worktree can be switched by another
         agent: verify branch before staging, and stage explicit paths only.
