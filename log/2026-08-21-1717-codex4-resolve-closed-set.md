# Issue #123 — closed-set resolver port

Agent: `codex4`
Claim: #131
Branch: `agent/codex4/resolve-closed-set`
Task baseline: `8f3e53f` (merged PR #115)

## Change

- Added the framework-agnostic TypeScript resolver in
  `server/src/pipeline/resolve.ts`.
- Preserved `MIN_ACCEPT_SCORE = 0.34`, the top-two margin confidence formula,
  `allow_abstain`, and the independent confusion cap behavior.
- Branded the returned food ID so callers can receive only a candidate-derived
  ID or `ABSTAIN`.
- Added focused tests for clear accept, near-tie confidence, threshold
  abstention, explicit non-abstention, confusion cap, empty candidates, and the
  closed-set type boundary.

## Verification

- TypeScript focused tests: 7 passed.
- TypeScript full suite: 32 passed.
- TypeScript build and lint: passed.
- Python `make check`: 249 passed, Ruff, invariants, STATUS check, and V3
  regression all passed.
- V0–V3 scorecard against task baseline `8f3e53f`: SHA-256
  `f376607c97ca6379ced8733d9043b39225606e341186743257bda32d39d6b434` before
  and after; `diff -u` exit 0.
- After rebasing onto the moving PR base `f2bd820`, the same scorecard remains
  byte-identical at SHA-256
  `4ee38f55ee522126699d68b320af7ee038de2092d2fcc547e2cbe3b85ab9ff59` before
  and after; `diff -u` exit 0.

Traps: Do not compare the scorecard to a moving `origin/main` without recording
the base commit. During this session main advanced beyond `8f3e53f` with golden
set changes; the task-baseline comparison stayed zero-line identical. Do not
change the threshold, import NestJS into the pipeline, or edit Python.
