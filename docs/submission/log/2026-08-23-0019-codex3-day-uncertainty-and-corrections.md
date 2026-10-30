# Issue #211 — Day uncertainty, count correction, and record removal

State: implementation complete on `agent/codex3/day-uncertainty-and-corrections`, based on `origin/main` `5bf4237`.

Changes:

- Day now renders an approximate server nutrient midpoint plus an aggregate portion band from item `grams`, `grams_p10`, and `grams_p90`.
- Count clarification now sends the existing server contract fields `{item_index, quantity, unit}`. For a count item this preserves `unit: "adet"`; no API field or nutrition calculation was added.
- Saved rows keep their existing audit-open action and now have an explicit local removal action with one native confirmation. Removal filters local Day state by idempotency key.
- Turkish copy was added for the portion band, removal confirmation, action, accessibility label, and cancel.
- Focused tests cover count-unit payloads, nutrient-free corrections, replace-by-idempotency save behavior, local removal, range rendering, and confirmation wiring.

Contract evidence:

- `POST /v1/meals/correct` accepts `meal` plus `corrections[]` with `item_index`, optional `food_id`, `quantity`, `unit`, and `grams`.
- Fixture-backed simulator round trip sent `{"item_index":0,"quantity":2,"unit":"adet"}` and received Simit `quantity=2`, `unit=adet`, `grams=200`, `grams_p10=160`, `grams_p90=250`, `portion_source=explicit_unit`, and server totals `658 kcal`.
- The response contract has no nutrient p10/p90 fields. The client therefore shows an aggregate gram interval and server nutrient midpoints marked approximate; it does not invent a kcal/protein interval or compute nutrition.

Acceptance evidence:

| Requirement | Evidence | Boundary |
| --- | --- | --- |
| Unknown quantity shows a range | `/tmp/mealog-day-211-evidence/day-unknown-range-simulator.png`: `Porsiyon toplamı: yaklaşık 300 g (225–395 g)` | iPhone Air iOS 26.5 Simulator, fixture-backed |
| Evidence-backed quantity shows a tighter range | `/tmp/mealog-day-211-evidence/day-after-removal-simulator.png`: one `2 adet Simit`, `200 g (160–250 g)` | iPhone Air iOS 26.5 Simulator, fixture-backed |
| Count request/result | `/tmp/mealog-day-211-evidence/review-before-count-simulator.png`, `initial-meal.json`, `correction-request.json`, `correction-response.json`, `day-after-count-simulator.png` | fixture server; not live Gemini |
| Removal updates Day | `/tmp/mealog-day-211-evidence/removal-confirmation-simulator.png`, `/tmp/mealog-day-211-evidence/day-after-removal-simulator.png`: 2 records/987 kcal to 1 record/658 kcal | iPhone Air iOS 26.5 Simulator, fixture-backed |
| Typecheck/export | `npm run typecheck` passed; `npx expo export --platform ios` passed with 699 modules | local build evidence only |

Runtime boundary: no physical iPhone and no live provider/API-key execution were performed. Simulator evidence used `VISION_PROVIDER=fixture`, `EXPO_PUBLIC_DEMO_MODE=false`, local API port `3091`; this demonstrates client wiring and rendering, not provider accuracy.

Checks: `npm run typecheck`, `npm test`, `npx expo export --platform ios`, `python3 scripts/status.py --check`, `python3 scripts/check_invariants.py`, and `git diff --check` passed. The repository merge gate also passed in throwaway `/tmp/mealog-211-venv`: `PATH=/tmp/mealog-211-venv/bin:$PATH make check` — Ruff clean, 275 server tests passed, invariants/status passed, and `no per-cuisine regression in V3`.

Traps: Do not describe the displayed gram band as a nutrient interval; the current correction response has no nutrient p10/p90. Do not claim this fixture-backed simulator run as physical-device or live-Gemini evidence. Count correction only becomes explicit when the client sends the existing `unit` value alongside `quantity`; do not add a new server field. Removal is local because there is no delete route.
