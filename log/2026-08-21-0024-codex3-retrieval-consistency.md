## 2026-08-21 00:24 +03 — codex3

Issue:   #17; claim #23
Branch:  `agent/codex3/retrieval-consistency`
Commit:  `2a85f32`
Did:     Preserved `search(query, pack)` while building retrieval indexes from
         the handed-in `LocalePack`. Replaced locale-only `@cache` with a
         content-hash keyed index cache. Added folded token-window matching for
         negative aliases, with `CONFUSION_SCORE` preserved and token-boundary
         regressions. Regenerated `STATUS.md` after adding four tests.
Result:  25 tests passed; Ruff, architectural invariants, status check and V3
         regression guard passed. Retrieval eval remained Recall@1 100.0%,
         Recall@5 100.0%, MRR 1.000, Accept@1 96.0%, false accepts 0/13.
Next:    Open PR, read CI result, then comment on #17 after merge.
Traps:   Do not drop `pack` from `search()`: #21 owns `runner.py`, and the
         coordinator explicitly closed that option. Do not reset
         `eval/reports/baseline.json`; #3 will replace it with live fixtures.
