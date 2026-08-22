# Request-scoped degraded-result propagation

Agent: `codex4`
Claim: #198
Branch: `agent/codex4/degraded-propagation`
Base: `19b145c` (`origin/main` after PR #196)

## Change

- Added the framework-free `VisionResult` envelope: `{ observations, degraded }`.
- Updated both TypeScript vision adapters; fixture replay preserves the recorded
  `degraded` flag, while Gemini derives the returned flag in a local request
  variable rather than making the runner inspect adapter state.
- Added `MealLog.degraded` and propagated it through the runner and automatic API
  serialization.
- Forced degraded results to `review` before grounded, ungrounded, threshold, or
  correction routing can produce `auto_accept`.
- Left the closed-set resolver, ABSTAIN items, p10-p90 bands, deterministic
  nutrition, and idempotency code unchanged.
- Extended the mobile source-contract test only; mobile UI/runtime files were not
  changed.

## Evidence

- High-confidence handwritten fallback stub: resolved `us.eggs_scrambled`,
  `degraded: true`, action `review`.
- Normal fixture/API replay: `degraded: false`; existing behavior remains intact.
- Supertest fallback envelope: HTTP 200 serializes `degraded: true` and action
  `review`.
- Correction of a degraded meal remains `review`.
- Mobile source checks assert that `auto_accept` additionally requires
  `!result.degraded` and that the Review surface displays degraded meals as
  review.

## Verification

- Server build: passed.
- Server lint: passed.
- Node server suite: 193 tests passed.
- Mobile `npm test`: passed.
- Mobile `npm run typecheck`: passed.
- Throwaway-venv `make check`: Ruff passed; 261 Python tests passed; invariants,
  STATUS, and V3 regression guard passed.
- `git diff --check`: passed.
- No evaluator, golden, baseline, scorecard, confidence threshold, Python, or
  dependency files changed.

Traps: never read `vision.degraded` after `await vision.perceive()`; concurrent
requests need the returned envelope. Do not turn a degraded result into an
auto-accept just because identity confidence is high. Fixture metadata is
request data; the committed fixtures remain non-degraded and no fixture was
modified.
