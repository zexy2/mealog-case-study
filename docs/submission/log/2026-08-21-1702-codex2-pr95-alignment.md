# PR #95 parity-reference alignment

Agent: `codex2`
Issue: #2
Claim: #82
Branch: `agent/codex2/grow-golden-set`

## State

Current `origin/main` is `263c159`. Branch already contains it as an ancestor
through merge commit `39d05d2`; head before this session was `b91e849`. Rebase
would rewrite already-published history and require force-push, prohibited by
AGENTS.md §5, so no rebase or force-push was performed. A normal push remains
safe.

Refreshed PR #95 body with complete before/after scorecard against current main:
ablation summary, all per-cuisine rows, all ground-truth tier rows, and
error-tag counts. Corrected stale `229.5%` V2/V3 text to current `12.7%` MAPE.
Baseline `eval/reports/baseline.json` remained byte-identical.

## Verification

- `make status` regenerated `STATUS.md`; no diff remained.
- Fresh `/tmp/mealog-codex2-pr95-final-venv`: `make check` passed, including
  Ruff, 249 tests, invariants, STATUS check, and V3 regression guard.
- Fresh offline harness replay: current-main reference is 9 rows; branch is 25
  rows. V3 is `12.7%` MAPE, `56% -> 20%` coverage, and `0.86 -> 0.47` Item F1.
- PR base/head remained `263c159` / `b91e849`, clean and mergeable before the
  body edit.

## Traps

Do not obey a rebase request by force-pushing an already-published branch:
AGENTS.md hard rule forbids history rewrite. First test ancestry; if current
main is already an ancestor, normal push or no-op is correct. Do not copy the
old `229.5%` scorecard from the stale PR body; #94, #96, #97, and #99 changed
the common pipeline before this parity snapshot. Do not reset `baseline.json`.
