## 2026-08-21 00:45 +03 — codex2
Issue:   #7; claim #22; PR #26 review follow-up
Did:     Rebasing onto merged #25, regenerated STATUS.md, removed all density
         metadata from volume units, and changed portion tests to assert the
         food-agnostic UNKNOWN_DENSITY_SPREAD fallback. Kept evidence-graded
         spreads and fraction/word-number parsing intact. Updated PR body.
Result:  `make check` passes: 40 tests, lint, invariants, status, and regression
         guard. V3 Mediterranean returns to 0.00%; baseline remains untouched.
Next:    Await CI/review. If PR #26 merges, comment on #7 and close claim #22.
Traps:   Density must not live on a container unit. Do not add loader.py or
         models.py here; food-level density is follow-up work after #8.
Branch:  `agent/codex2/portion-density` at `2601b7f` plus this log commit.
