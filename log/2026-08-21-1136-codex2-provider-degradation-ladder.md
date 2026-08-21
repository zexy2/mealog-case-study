# Provider degradation ladder

Issue: #58  
Claim: #62  
Branch: `agent/codex2/provider-degradation-ladder`

## State

Implemented the Gemini adapter degradation ladder with transient-only retries
(429/500/502/503/504 and timeout errors), bounded exponential jitter,
`Retry-After`, a shared wall-clock deadline, configured-model to secondary-model
to text-only fallback, explicit `degraded`/`rung` metadata, and exhausted-provider
structured logging. Added fake-transport tests; no test calls the network.

## Verification

- `ruff check server/src server/tests`: pass
- `pytest -q server/tests`: 64 passed
- `scripts/check_invariants.py`: pass
- `scripts/status.py --check`: pass
- `eval/harness.py --configs V0,V1,V2,V3 --check-regression`: pass

## Traps

Do not run or edit this task from the old `/tmp/mealog-codex2-idempotency-20260821`
worktree: it is the merged user-scoped-idempotency branch. The first draft landed
there uncommitted and was moved with a temporary stash before work continued on
the correct provider-degradation worktree. Do not use a live Gemini key in tests;
the fake opener is the network boundary.
