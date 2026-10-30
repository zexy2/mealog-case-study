# Focused live gallery retest after PR #184

State: complete; the scoped iOS Simulator live-provider retest ran against a fresh current-main Expo bundle and a rebuilt Node Gemini server.

Verified:

- `EXPO_PUBLIC_DEMO_MODE=false`, Metro on new port 8091, API pointed at Node Gemini on 127.0.0.1:3001.
- Stale-bundle guard passed: Metro path was `/private/tmp/mealog-live-gallery-followup.KMTtAG/apps/mobile`, and the initial accessibility tree had live capture copy with no demo controls.
- Plain rice image 2 selected `tr.pilav`, identity 100%, `review`, 180 g with 135–243 g, `Katalog kaynağı`.
- Simit + ayran image 6 preserved both items: `tr.simit` 100 g (75–135 g) and `tr.ayran` 200 g (150–270 g), both identity 100%, `review`.
- Repeating image 6 produced the same ids, confidence, midpoint grams, ranges, and catalogue fallback.
- Lahmacun remained `ABSTAIN`: UI showed a 100% Lahmacun candidate but no selected food_id or portion values.
- PR #184 changed the wide-band rice and simit+ayran results from the earlier `auto_accept` behavior to `review`.
- Readable screenshots and structured evidence are under `/tmp/mealog-live-gallery-2026-08-22/` in `focused-*.png`, `focused-retest.tsv`, and `focused-retest-run.txt`.

Limitations: only the requested four selections were rerun; the other eight gallery images were not rerun. No saved-Day duplicate flow, demo-mode flow, or new provider/API-key value was tested. No source, fixture, golden, baseline, evaluator, API-key, or gallery photo was changed.

Traps: a new Metro port and explicit fresh worktree are necessary evidence against a stale Expo bundle. Wide bands are now routed to Review by PR #184; do not describe these current results as auto-accepted. A 100% nearest candidate is still not a selected food: lahmacun’s abstention has no food_id or grams to record.

Agent: codex3
Issue: #187
