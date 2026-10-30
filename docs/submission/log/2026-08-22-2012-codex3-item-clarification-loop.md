# Item-scoped clarification loop

Date: 2026-08-22
Agent: codex3
Issue: #195
Base: `9ba5083` (merged PR #194)
Branch: `agent/codex3/item-clarification-loop`

## State

Implementation complete on branch; PR pending review. No source, fixture,
golden, baseline, evaluator, locale-pack, workflow, or device evidence changes.

## Done

- Added catalogue-backed item clarification metadata for count, identity, and
  portion uncertainty. Count choices are emitted only for a countable catalogue
  unit and preserve `null` for “Emin değilim”.
- Added `POST /v1/meals/correct`. It validates locale catalogue food IDs,
  re-runs portion and nutrition calculation server-side, recomputes totals and
  action, preserves untouched items, records `user_confirmed` provenance, and
  never trusts client grams or nutrients, including ABSTAIN items.
- Added mobile item-scoped count controls, correction request construction,
  server-backed save, typed Turkish/English copy, and idempotent saved-meal
  replacement.
- Added focused server unit/e2e tests and mobile correction/static tests.

## Verification

- `server`: `npm test` — 16 files, 188 tests passed.
- `server`: `npm run lint` and `npm run build` passed.
- `apps/mobile`: `npm run typecheck` passed.
- `apps/mobile`: `node --experimental-strip-types src/clarification.test.mjs`
  passed.
- `apps/mobile`: `npm test` passed (locale, demo-state, Day detail tests).
- `apps/mobile`: `npx expo export --platform android` passed.
- `PATH="/tmp/mealog-item-clarification-venv/bin:$PATH" make check` passed:
  Ruff, 261 Python tests, invariants, STATUS, and offline regression guard.
- `git diff --cached --check` passed.

## Limitations

No iOS/Android device or emulator execution and no live Gemini/API execution
were performed in this session. Demo-mode correction correctly reports that a
server connection is required; nutrient arithmetic stays out of the mobile
client.

Traps: Do not trust the submitted MealLog snapshot, including ABSTAIN grams or
nutrients; re-ground every item. Do not use candidate-list length as identity
uncertainty: retrieval returns alternatives for confident matches. Node's
strip-types test runner needs type-only imports when a focused test imports a
`.ts` helper. `make check` needs the throwaway environment above because this
machine has no bare `python` command.
