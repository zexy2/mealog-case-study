## 2026-08-21 01:46 +03 — codex4

Issue:   #42; claim #45
Branch:  `agent/codex4/evaluation-docs`
Did:     Rewrote `docs/evaluation.md` to match the implemented evaluation
         surface: worst-cuisine MAPE and spread, covered-sample calorie error
         with coverage, identity metrics, tier aggregation, and the automatic
         versus human-judgement error taxonomy. Added a separate not-yet-measured
         section stating that all recorded fixtures are synthetic and linking
         the real-provider and golden-set work.
Result:  Ruff passed; 54 tests passed; architectural invariants, generated
         STATUS check, and V3 regression guard passed. The full harness
         scorecard was byte-for-byte unchanged between `origin/main` and this
         branch. No evaluation code or dependency declaration changed.
Next:    Open the PR, read its CI result, and comment on #42 after the change
         merges.
Traps:   Every named metric must exist in `eval/metrics.py`; do not add
         aspirational calibration, retrieval, operations, or confidence metrics.
         Keep the synthetic-fixture caveat singular and prominent. If the
         document and code disagree, update only the document.
