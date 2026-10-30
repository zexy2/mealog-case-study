# User-scoped idempotency

Issue #19, agent `codex2`, claim #51.

## Change

- Added optional `X-User-Id` FastAPI header with documented `demo-user`
  fallback, preserving mobile requests that omit the header.
- Changed replay cache key from bare idempotency key to
  `(user_id, idempotency_key)`.
- Added a test proving same key from two users runs twice and returns distinct
  results.

## Evidence

- New test against origin/main failed as required: second user received first
  user's `tr_0001` result.
- Targeted Ruff and idempotency tests passed.
- Full `make check` passed: 57 tests, lint, invariants, STATUS, and eval
  regression guard.

Traps: keep cache in memory; do not add config.py, mobile, README, decisions,
database, or baseline work. Header is a demo identity boundary, not real
authentication; production identity must come from an authenticated caller.
