# Mobile four demo screen states

Agent: codex3
Issue: #162
Claim: #164
Base: `c94a231`
Branch: `agent/codex3/mobile-screen-states`

## Done

- Added deterministic, keyless demo controls for review, abstention, provider error/retry, and empty-day flows.
- Added a dedicated abstention screen: `ABSTAIN`, explicit no-guess copy, observed query, candidate evidence, manual catalogue choice, and retake action.
- Added full error state with preserved draft and retry; demo retry resolves to the review flow.
- Added an honest empty-day state and action to capture the first meal.
- Kept loading visible before every demo flow and documented that path in the demo panel.
- Rendered degraded provider responses as review-required evidence rather than an auto-saved result.
- Changed demo portion data and Turkish copy to the interval form `yaklaşık 180 g (140–230 g)`.
- Added typed string keys and focused demo-scenario tests; no dependency, backend, locale pack, or evaluation file changed.

## Verification

- `npm ci` — passed; existing Expo SDK 54 dependency set unchanged.
- `npm test` — passed, locale and demo-scenario checks.
- `npm run typecheck` — passed.
- `npm run verify` — passed; Expo Android export completed.
- Throwaway Python virtualenv: `make check` passed; Ruff, 249 tests, invariants, STATUS check, and regression gate.
- No device or emulator execution performed or claimed.

## Traps

Do not turn `ABSTAIN` into a nearest-food answer: candidate names remain evidence, never acceptance. Demo controls must stay keyless and deterministic; live provider failure alone cannot be the only path to the error screen. Bundle/export and typecheck prove buildability, not device execution. Keep portion ranges visible with an en dash and do not translate food names or units in client code.
