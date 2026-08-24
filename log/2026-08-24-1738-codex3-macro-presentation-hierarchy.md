# Mobile macro presentation hierarchy

State:    Ready for review on `agent/codex3/macro-presentation-hierarchy`.

Done:
- Replaced Review's duplicate emoji macro pills and audit-row repetition with one typed nutrition card.
- Kept the audit panel for catalogue, confidence, grams, source, and provenance only.
- Suppressed nutrient values after a local food, quantity, or portion correction until the server recomputes them.
- Made Day show macro totals only when at least one verified catalogue record exists; local manual calories and uncaloried notes do not become false `0 g` macros.
- Added focused tests for verified, manual, and unavailable nutrition presentation states plus Turkish copy.

Verification:
- `apps/mobile`: `npm test`, `npm run typecheck`, and `npx expo export --platform ios` passed.
- Throwaway venv: `make test` (289 passed), `make lint`, `python eval/harness.py --check-regression`, `python scripts/check_invariants.py`, and `python scripts/status.py --check` passed.
- iPhone Air Simulator, demo mode only: checked Day total macros and the saved Review nutrition card. No physical device or live-provider execution was performed.

Traps:    Never scale or recompute macros in the client. A changed candidate, quantity, or grams value makes the prior server nutrient result stale; hide it until `/v1/meals/correct` returns. Manual calories and uncaloried notes carry no macro evidence, so `0 g` is not an acceptable fallback display.
