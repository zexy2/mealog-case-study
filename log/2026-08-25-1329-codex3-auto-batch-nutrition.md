# Session: automatic batched unverified nutrition estimates

Agent: `codex3`
Issue: #367
Branch: `agent/codex3/chicken-egg-abstain`

## State

Review and live abstention now prepare unverified nutrition estimates
automatically for catalogue misses. Up to 20 unresolved items from one meal are
sent in one Gemini request. Each result remains `ABSTAIN` until the user accepts
that specific estimate; nothing is auto-accepted or auto-saved. Catalogue-backed
items retain their verified source treatment, while model output carries an
explicit `AI TAHMİNİ · DOĞRULANMAMIŞ` label and
`llm_unverified_estimate` provenance.

## Runtime evidence

- `GEMINI_API_KEY` was present; its value was not printed or stored.
- Server ran from the current branch on port 3010 with
  `GEMINI_MODEL=gemini-3.1-flash-lite`.
- One live batch containing `pide` and `piyaz` returned HTTP 200 and two ordered
  estimates from one provider request. `pide` returned 450–750 kcal with a
  server-computed 600 kcal midpoint; `piyaz` returned 200–350 kcal with a
  server-computed 275 kcal midpoint. Both carried model id, assumptions, ranges,
  and unverified provenance.
- Replaying the same user-scoped idempotency key returned a byte-identical cached
  response in 0.002122 seconds.
- Fresh Expo bundle ran on iOS Simulator with demo mode false, API port 3010,
  and Metro port 8097. Text input `pide ve piyaz` reached Review with two
  unresolved items. Both estimates appeared without tapping an estimate button,
  and each still required its own explicit `Bu tahmini kullan` acceptance.
- No physical-device run was performed. Estimate accuracy was not measured.

## Reliability boundaries

- Maximum 20 items per batch; server rejects larger payloads before provider use.
- Dedicated in-memory limits: 5 new batches per user per minute and 20 per user
  per day. Valid idempotent replays bypass quota consumption.
- User-scoped completed cache, in-flight de-duplication, payload fingerprint
  conflicts, 20-second timeout, and a three-failure/60-second circuit breaker are
  active.
- Limits and cache are process-local; distributed production deployment would
  need shared storage and a shared rate limiter.

## Verification

- Server: 313 Vitest tests, build, typecheck, and ESLint passed.
- Mobile: locale/demo/Day/clarification/telemetry/nutrition-safety tests and
  TypeScript typecheck passed.
- Expo export passed for iOS and Android with demo mode false.
- Python: 287 tests, Ruff, V3 regression guard, invariants, and STATUS check passed.
- `git diff --check` passed.

Traps: Gemini rejected JSON response schemas containing array `minItems` and
`maxItems`; enforce batch length and result-index integrity in server code instead.
A single batch reduces provider calls but does not make model estimates verified
nutrition. Never remove the warning, provenance, ranges, or explicit acceptance
step. Do not describe Simulator evidence as physical-device evidence.
