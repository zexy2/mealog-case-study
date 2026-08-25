# Session: unverified Gemini nutrition fallback

Agent: `codex3`  
Issue: #367  
Branch: `agent/codex3/chicken-egg-abstain`

## State

Catalogue misses still return `ABSTAIN` with no grounded nutrition. After that
boundary, the user may explicitly request a separate Gemini estimate. The server
returns broad calorie and macro ranges, Turkish assumptions, model id, and
`llm_unverified_estimate` provenance. No estimate is generated in the mobile
client and no provider key enters Expo.

## Runtime evidence

- `GEMINI_API_KEY` was present; its value was not printed or stored.
- Fresh server build on port 3010 with the repository default
  `gemini-3.6-flash` returned typed HTTP 503. A direct status-only diagnostic
  identified provider HTTP 429 `RESOURCE_EXHAUSTED`.
- The account model list included `gemini-3.1-flash-lite`. Restarting with
  `GEMINI_MODEL=gemini-3.1-flash-lite` returned HTTP 200 for `pide`, quantity 1:
  450–850 kcal, 15–35 g protein, 60–100 g carbohydrate, and 12–35 g fat, with
  four Turkish assumptions and explicit unverified provenance.
- Fresh Expo bundle ran on iOS Simulator with demo mode false, API port 3010,
  and Metro port 8097. Text input `pide` reached the catalogue abstention screen;
  tapping `AI tahmini al` displayed a second live Gemini response with ranges,
  assumptions, and the warning that values were unverified.
- Acceptance reached Review. Runtime exposed a contradictory
  `GÜVENLE DOĞRULANDI` banner; the banner logic was corrected to the review state
  and `Doğrulanmamış AI Tahmini` copy. This final copy has focused static/test
  evidence, not a second uninterrupted runtime capture because the operator
  resumed control of the Simulator.

## Verification

- Server: 309 Vitest tests, build, typecheck, ESLint passed.
- Mobile: locale/demo/Day/clarification/telemetry/nutrition-safety tests and
  TypeScript typecheck passed.
- Expo export passed for iOS and Android with demo mode false.
- Python: 287 tests, Ruff, V3 regression guard, invariants, and STATUS check passed.
- `git diff --check` passed.
- No physical-device run was performed. LLM output was not accuracy-scored.

Traps: A successful provider response is not verified nutrition. Keep the model
range, assumptions, model id, and provenance together. The default
`gemini-3.6-flash` quota was exhausted during this run; silently replacing its
503 with client defaults would recreate the false-nutrition defect. Simulator
state can change while the human is testing, so do not claim an uninterrupted
post-fix UI capture without rerunning it.
