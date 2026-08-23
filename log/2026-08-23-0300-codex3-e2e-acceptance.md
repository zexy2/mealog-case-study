# E2E acceptance run — cf23d16

## Scope and evidence boundary

- Base tested: cf23d160e65d302d44619b032f30e3225a6ee7e1 (main).
- GEMINI_API_KEY: present at startup; its value was never printed, saved, or logged.
- Server: current Node service, VISION_PROVIDER=gemini, port 3099, with a fresh build.
- Client: fresh Expo bundles with EXPO_PUBLIC_DEMO_MODE=false on ports 8101, 8103,
  and 8104. The demo-only auto-accept client check used port 8105.
- Simulator: iPhone Air, iOS 26.5, UDID E7332C18-A830-4802-8E40-51882E829F17,
  Xcode 26.6 (17F113). No physical device was used.
- Additional test-only servers: fixture port 3090, a temporary in-memory degraded
  adapter on port 3092, and a live Gemini service with an invalid model on port
  3091. The degraded adapter was a test harness only; no repository file was
  changed.
- No source, fixture, golden, baseline, evaluator, locale, or threshold file was
  changed. Gallery images were read from the simulator and were not copied into
  the repository.
- Direct API results were sanitized before being written below. Provider envelopes,
  image bytes, and credentials are not included.

## Result count

The table contains 42 checks. Four are not assessable because the gallery picker
did not expose the A2/C7 filenames: three A2 repeats were a visible simit+ayran
asset, not a verifiable two-simit A2.jpg, and no standalone C7 ayran could be
identified. Of the remaining 38 checks: 30 passed, 7 failed, and 1 is partial.

## Case table

Fields are server response fields unless the row says demo-only or client-only.
An em dash means the server did not return an item/result field.

| ID | Input / test | HTTP | action | food_id | grams (p10–p90) | quantity | portion source / provenance | total kcal | client screen | Day record | Result |
|---|---|---:|---|---|---|---|---|---:|---|---|---|
| A1 | auto_accept server action; all 80 committed fixture IDs scanned | — | 0 auto_accept reached (76 ask, 4 review) | — | — | — | — | — | no live route; demo-only auto-accept reached Day | no live record evidence | FAIL |
| A1-client | demo auto-accept flow | — | auto_accept | tr.simit | 100 g (85–120 g) | null | catalogue default; demo data | 329 | Day; record visible and removable | yes, demo-only; removal returned the Day count from 2 to 1 | PASS for demo routing, not server acceptance |
| A2 | live text simit | 200 | review | tr.simit | 100 g (65–145 g) | null | catalogue_default / catalogue.default_serving_g=100 | 329 | Review | no; Day count unchanged when save was not pressed | PASS |
| A3 | bir fincan turk kahvesi | 200 | ask | ABSTAIN | 0 (0–0) | 1 | not_applicable / not_applicable | 0 | Abstention | no | PASS |
| A4 | degraded test adapter, simit | 200 | review, degraded=true | tr.simit | 100 g (75–135 g) | 1 | catalogue_default_scaled / fallback=catalogue.default_serving_g=100; quantity=1; unit=unknown | 329 | Review with Yanıt zayıf kanıtla geldi warning | no | PASS |
| A5 | invalid Gemini model / provider outage | 503 | — | — | — | — | — | — | Add with Sağlayıcıya ulaşılamadı and retry | no | PASS |
| B1 | iki adet lahmacun | 200 | review | tr.lahmacun | 280 g (224–350 g) | 2 | explicit_unit / unit=adet; quantity=2.0; per_unit_g=140; source=catalogue_serving | 680.4 | not separately opened | direct API; no client save | PASS |
| B2 | 1 porsiyon pilav | 200 | review | tr.pilav | 180 g (144–225 g) | 1 | explicit_unit / unit=porsiyon; quantity=1.0; per_unit_g=180; source=catalogue_serving | 271.8 | not separately opened | direct API; no client save | PASS |
| B3 | bir porsiyon ceviz | 200 | review | tr.ceviz | 30 g (24–37.5 g) | 1 | explicit_unit / unit=porsiyon; quantity=1.0; per_unit_g=30; source=catalogue_serving | 203.7 | not separately opened | direct API; no client save | PASS |
| B4 | bir fincan turk kahvesi | 200 | ask | ABSTAIN | 0 (0–0) | 1 | not_applicable / not_applicable | 0 | Abstention path verified separately | no | PASS |
| B5 | 3 dilim beyaz ekmek | 200 | review | tr.ekmek_beyaz | 75 g (60–93.8 g) | 3 | explicit_unit / unit=dilim; quantity=3.0; per_unit_g=25; source=catalogue_serving | 207.0 | not separately opened | direct API; no client save | PASS |
| B6 | 2 simit | 200 | review | tr.simit | 200 g (150–270 g) | 2 | catalogue_default_scaled / fallback=catalogue.default_serving_g=100; quantity=2; unit=unknown | 658.0 | not separately opened | direct API; no client save | PASS |
| B7 | 1 kase mercimek corbasi | 200 | review | tr.mercimek_corbasi | 250 g (200–312.5 g) | 1 | explicit_unit / unit=kase; quantity=1.0; per_unit_g=250; source=catalogue_serving | 155.0 | not separately opened | direct API; no client save | PASS |
| B8 | 1 porsiyon kuru fasulye | 200 | review | tr.kuru_fasulye | 250 g (200–312.5 g) | 1 | explicit_unit / unit=porsiyon; quantity=1.0; per_unit_g=250; source=catalogue_serving | 295.0 | not separately opened | direct API; no client save | PASS |
| C1 | haşlanmış makarna | 200 | review | tr.makarna_kuru | 80 g (52–116 g) | null | catalogue_default / catalogue.default_serving_g=80 | 284.8 | Review if submitted | no | FAIL: cooked input became dry pasta |
| C2 | pişmiş makarna | 200 | review | tr.makarna_kuru | 80 g (52–116 g) | null | catalogue_default / catalogue.default_serving_g=80 | 284.8 | Review if submitted | no | FAIL: cooked input became dry pasta |
| C3 | haşlanmış bulgur | 200 | ask | ABSTAIN | 0 (0–0) | null | not_applicable / not_applicable | 0 | Abstention-compatible server result | no | PASS |
| C4 | haşlanmış mantı | 200 | review | tr.manti | 200 g (130–290 g) | null | catalogue_default / catalogue.default_serving_g=200 | 584 | Review if submitted | no | FAIL: cooked input became catalogue manti |
| C5 | ezogelin çorbası | 200 | ask | ABSTAIN | 0 (0–0) | null | not_applicable / not_applicable | 0 | Abstention-compatible server result | no | PASS |
| C6 | kadayıf tatlısı; first live request, then retry | 503, then 200 | —, then ask | —, then ABSTAIN | —, then 0 (0–0) | —, then null | —, then not_applicable / not_applicable | —, then 0 | Add/error on first request; abstain on retry | no | FAIL: expected abstain was interrupted by transient provider 503 |
| C7 | Türk kahvesi | 200 | ask | ABSTAIN | 0 (0–0) | 1 | not_applicable / not_applicable | 0 | Abstention-compatible server result | no | PASS |
| C-control-1 | çay | 200 | ask | ABSTAIN | 0 (0–0) | 1 | not_applicable / not_applicable | 0 | Abstention-compatible server result | no | PASS |
| C-control-2 | demlenmiş çay | 200 | ask | ABSTAIN | 0 (0–0) | null | not_applicable / not_applicable | 0 | Abstention-compatible server result | no | PASS |
| D-A2-1 | gallery visible simit+ayran image, repeat 1 | 200 via real picker | review | tr.simit + tr.ayran | simit 100 g (75–135); ayran 200 g (150–270) | simit 1 whole; ayran 1 cup | both catalogue_default_scaled / fallback=catalogue.default_serving_g with quantity=1; unit=unknown | not visible in Review AX | Review with both items | no | N/A: picker filename not provable as A2.jpg |
| D-A2-2 | same gallery image, repeat 2 | 200 via real picker | review | tr.simit + tr.ayran | same as D-A2-1 | same as D-A2-1 | same as D-A2-1 | not visible in Review AX | Review with both items | no | N/A: picker filename not provable as A2.jpg |
| D-A2-3 | same gallery image, repeat 3 | 200 via real picker | review | tr.simit + tr.ayran | same as D-A2-1 | same as D-A2-1 | same as D-A2-1 | not visible in Review AX | Review with both items | no | N/A: picker filename not provable as A2.jpg |
| D-C7 | standalone ayran | — | — | — | — | — | — | — | not run | no | N/A: no standalone C7 asset could be identified in picker |
| D-OOC-1 | karniyarik-style eggplant photo | 200 via real picker | ask | ABSTAIN | 0 (0–0) | null | not_applicable / not_applicable | 0 | Abstention | no | PASS |
| D-OOC-2 | bulgur-style photo | 200 via real picker | ask | ABSTAIN | 0 (0–0) | null | not_applicable / not_applicable | 0 | Abstention | no | PASS |
| D-OOC-3 | pink flowers / nature photo | 200 via real picker | review with empty items | — | — | — | — | 0 or not exposed | Review empty, not Abstention | no | FAIL: nature photo did not abstain |
| E1 | same gallery image, same idempotency key twice | 200, 200 | ask, ask | ABSTAIN, ABSTAIN | 0 (0–0), 0 (0–0) | null, null | not_applicable / not_applicable | 0, 0 | direct API | server returned identical sanitized responses; no list endpoint | PASS for replay equality; record count not externally enumerable |
| E2 | same gallery image, two different idempotency keys | 200, 200 | ask, ask | ABSTAIN, ABSTAIN | 0 (0–0), 0 (0–0) | null, null | not_applicable / not_applicable | 0, 0 | direct API | both keys accepted; no list endpoint to count records | PARTIAL: distinct-key persistence cannot be observed through current API |
| E3 | provider killed by invalid model | 503 | typed provider failure | — | — | — | — | — | Add; retry available | no | PASS: category=provider_unavailable, retry_attempted=true, attempts=2 |
| E4 | POST /v1/meals/correct count correction | 200 | review | tr.simit | 200 g (160–250 g) | 2 adet | explicit_unit / unit=adet; quantity=2.0; per_unit_g=100; correction=user_confirmed | 658 | direct API | not client-saved | PASS |
| E5 | POST /v1/meals/correct identity correction | 200 | review | tr.ayran | 200 g (130–290 g) | null | catalogue_default / catalogue.default_serving_g=200; correction=food_id=user_confirmed | 74 | direct API | not client-saved | PASS |
| E6 | POST /v1/meals/correct portion correction | 200 | review | tr.simit | 120 g (96–150 g) | null | explicit_unit / unit=g; quantity=120.0; correction=user_confirmed; correction=grams=user_confirmed | 394.8 | direct API | not client-saved | PASS |
| E7 | GET /health | 200 | — | — | — | — | — | — | — | — | PASS: status=ok, vision=gemini |
| F1 | submit live simit; do not press Bugüne kaydet; open Day | 200 | review | tr.simit | 100 g (65–145 g) | null | catalogue_default / catalogue.default_serving_g=100 | 329 | Review, then Day | count unchanged; could not reproduce double-write | PASS |
| F2 | live Review audit panel | 200 | review | tr.simit | 100 g (65–145 g) | null | visible source and provenance | 329 | Nasıl bulundu? details were open by default | no save | PASS |
| F3 | portion display | 200 | review | tr.simit | 100 g (65–145 g) | null | band visible, not point-only | 329 | Review showed yaklaşık 100 g (65–145 g) | no save | PASS |
| F4 | delete final record and verify empty day | — | — | — | — | — | — | — | Day showed BUGÜN SESSİZ / Henüz bir öğün yok. | yes, deleted; no separate one-tap undo control was exposed | FAIL for one-tap undo requirement; delete itself works |
| G1 | log safety / reviewer visibility | — | — | — | — | — | — | — | — | — | PASS: service logs showed startup only; no key, image bytes, or raw provider envelope. Reviewer can see typed 503 category/retry fields and sanitized meal fields, but not raw provider evidence. |

## Correction integrity

For E4–E6 the submitted MealLog snapshot was deliberately poisoned in the
temporary request object with 99,999 g and 99,999 nutrient values. The server
ignored those client values, loaded the Turkish catalogue, re-estimated the
portion, and recomputed nutrients. The responses above therefore show server
recomputation, not trust in client grams or calories.

## Defects ranked by user impact

1. **High — cooked/dry containment is incomplete.** haşlanmış makarna and
   pişmiş makarna resolved to dry pasta (284.8 kcal), and haşlanmış mantı
   resolved to catalogue manti (584 kcal). A user can receive a plausible,
   calorie-bearing wrong answer instead of ABSTAIN.
2. **High — live auto_accept was not reachable.** Across all 80 committed
   fixture IDs sent through the running Node HTTP service, the observed action
   distribution was 76 ask and 4 review, with zero auto_accept. The client
   demo-only tile reaches Day, but this does not prove the server route,
   highlighted record, or undo contract.
3. **High — nature photo can land on empty Review.** The flower image returned
   HTTP 200 with review and no items, not ABSTAIN. That is an ambiguous screen
   where a non-food photo should be explicitly rejected.
4. **Medium — repeated visible simit+ayran photo did not establish the
   two-simit A2 expectation.** The real picker asset returned one tr.simit plus
   one tr.ayran on all three repeats. The picker did not expose source filenames,
   so the A2.jpg claim cannot be accepted or refuted from this run. The result
   was deterministic, but default grams came from catalogue fallback rather than
   visible unit evidence; the band and provenance were shown.
5. **Medium — one cooked/dry case had a transient provider outage.** kadayıf
   tatlısı first returned typed 503 and only abstained after retry. This is safe
   against a wrong calorie log but fails the requested single-run abstention
   path.
6. **Medium — one-tap undo is not exposed as such.** Record removal requires a
   confirmation dialog. Delete and empty-day rendering worked, but the requested
   one-tap undo affordance was not observed.
7. **Low / observability limitation — persistence cannot be counted externally.**
   Same-key replay equality and distinct-key acceptance were verified, but the
   current API exposes no day-record list, so this run cannot independently count
   committed records for E1/E2.

## Evidence files

- /tmp/mealog-e2e-cf23d16/evidence/A2-run1-review.png
- /tmp/mealog-e2e-cf23d16/evidence/A2-run2-review.png
- /tmp/mealog-e2e-cf23d16/evidence/A2-run3-review.png
- /tmp/mealog-e2e-cf23d16/evidence/karniyarik-abstain.png
- /tmp/mealog-e2e-cf23d16/evidence/bulgur-abstain.png
- /tmp/mealog-e2e-cf23d16/evidence/flower-review-empty.png
- /tmp/mealog-e2e-cf23d16/evidence/empty-day.png
- /tmp/mealog-e2e-cf23d16/text-results.json
- /tmp/mealog-e2e-cf23d16/corrections-results.json
- /tmp/mealog-e2e-cf23d16/idempotency-results.json
- /tmp/mealog-e2e-cf23d16/provider-503.json

## Verification commands

- git diff --check: pass
- python3 scripts/status.py --check: pass (STATUS.md matches the repository)
- GET /health on the live Node service: 200
- Xcode, iOS Simulator, and xcrun simctl: available
- Expo fresh iOS bundles: completed on ports 8101, 8103, 8104, and demo-only 8105

## HANDOFF

State: full acceptance run completed against cf23d16; 30 pass, 7 fail, 1 partial,
4 not assessable.
Done: server, fixture, degraded, typed-503, live Expo Simulator, text, photo,
idempotency, correction, health, logging-safety, delete, and empty-day paths tested.
Next: fix the ranked defects; no implementation was made in this acceptance run.
Traps: do not call the demo auto-accept tile server evidence; do not call the
visible simit+ayran asset A2.jpg without a filename mapping; no physical-device
result exists; no standalone C7 ayran was identifiable.
Branch: agent/codex3/e2e-acceptance
Commit: report commit will be created after this log is added; no PR will be opened.
