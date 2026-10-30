# Mobile four states — session handoff

Date: 2026-08-23
Agent: codex3
Claim: #223
Branch: `agent/codex3/mobile-four-states`
Base: `cd0d7b5` (`origin/main` at start)

## Priority check: suspected double-write

Before source changes, I ran one photo through the current app without pressing
`Bugüne kaydet`, then opened Day. The demo run and a live Gemini run both left
Day at the existing single record. No extra record appeared: could not
reproduce the suspected double-write. This was an iOS Simulator run, not a
physical-device result. The live-provider credential was supplied through the
process environment only and is not recorded here.

## Delivered

- Demo controls now reach auto-accept, review, abstain, degraded, retry error,
  and empty-day paths.
- Routing uses the existing response contract: `auto_accept` goes to Day and
  gets a highlighted row with one-tap undo; `review` and ordinary `ask` open
  Review without a write; `ask` containing the existing `ABSTAIN` item sentinel
  opens the abstention screen; degraded responses remain Review-only; HTTP 503
  returns to Add with `Sağlayıcıya ulaşılamadı`.
- Abstention explains the catalogue boundary and offers writing the meal or
  retaking the photo; it never saves the `ABSTAIN` item.
- Review distinguishes an unsaved review from a saved-record correction, opens
  `Nasıl bulundu?` by default, asks count questions when the server supplies a
  count clarification, and always renders a valid portion band.
- Demo review shows the count question `Kaç adet Simit vardı?` and the band
  `yaklaşık 100 g (85–120 g)`.

## Runtime evidence

The evidence is local to `/tmp/mealog-162-evidence/` and is not committed:

- `auto-accept-day.png` — highlighted Day record and `Geri al`
- `review.png` — count clarification, band, and open audit rows
- `abstain.png` — explicit catalogue-boundary abstention and next actions
- `degraded.png` — warning and Review-only degraded response
- `error.png` — retryable provider-error state
- `empty.png` — empty-day state

Runtime execution used iPhone Air, iOS 26.5 Simulator. No physical-device
execution is claimed. The live-provider run used one rice photo for the
pre-code double-write check; the remaining state evidence is deterministic
demo-mode evidence.

## Checks

- `apps/mobile`: `npm test` — passed (locale, demo states, Day detail,
  clarification)
- `apps/mobile`: `npm run typecheck` — passed
- `apps/mobile`: `npx expo export --platform ios` — passed
- `make lint` — passed
- `make test` — 280 passed
- `make check` — passed, including no per-cuisine V3 regression
- `python3 scripts/check_invariants.py` — passed
- `python3 scripts/status.py --check` — passed
- `git diff --check` — passed

Eval impact: no server, pipeline, threshold, locale pack, evaluator, golden,
baseline, or CI files changed; offline evaluation numbers are unchanged.

Traps: Do not invent a literal `abstain` action: current main represents this
case as `action: "ask"` with an item whose existing `food_id` is `ABSTAIN`.
Do not auto-save `review`, `ask`, or degraded responses, and do not claim a
physical-device result from Simulator or an exported bundle. Keep the live
provider credential out of logs, screenshots, commits, and PR text.
