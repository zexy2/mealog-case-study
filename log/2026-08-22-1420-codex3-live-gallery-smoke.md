# Live-provider iOS Simulator gallery smoke

Agent: codex3  
Claim: #187  
Branch: `agent/codex3/live-gallery-smoke`  
Base: `origin/main` at `95bc0be` (PR #158 descendant)  
Device: iPhone Air, iOS 26.5, UDID `E7332C18-A830-4802-8E40-51882E829F17`

## Verified

- Current Node server health returned `{"status":"ok","vision":"gemini"}` on `127.0.0.1:3000`.
- `GEMINI_API_KEY` was absent from the shell environment but present in the already-running Node server process; its value was never printed, saved, or logged.
- Expo ran with `EXPO_PUBLIC_DEMO_MODE=false` and `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000` after Metro reload on port 8083.
- All 12 Photos gallery images were selected one by one through the real iOS Photos picker and completed through the live provider.
- Karniyarik, bulgur, iced coffee, flowers, waterfalls, nature, and leaves abstained without a selected food ID or grams.
- Lahmacun produced an exact 100% candidate but still abstained; this is a conservative coverage/false-reject finding, not a false accept.
- Plain rice auto-accepted as `tr.pilav` with 180 g, p10 135 g, p90 243 g.
- Simit + ayran auto-accepted as two items: `tr.simit` at 100 g (75–135 g) and `tr.ayran` at 200 g (150–270 g). Day title preserved `Simit · Ayran`; Review preserved both item audits.
- Repeating the same simit + ayran photo returned identical grams and bands, supporting deterministic catalogue fallback. The values are not visual measurements.
- Auto-accept was observed despite wide uncertainty bands; this is flagged in `results.tsv`.

## Evidence

Temporary evidence only, all outside the repository:

- `/tmp/mealog-live-gallery-2026-08-22/results.tsv`
- `/tmp/mealog-live-gallery-2026-08-22/run.txt`
- `/tmp/mealog-live-gallery-2026-08-22/result-01-karniyarik.png` through `result-12-leaves.png`
- `/tmp/mealog-live-gallery-2026-08-22/repeat-06-simit-ayran.png`
- `/tmp/mealog-live-gallery-2026-08-22/gallery-picker.png`

All result screenshots were readable 1260×2736 PNGs. No gallery photo was copied into the repository.

## Limitations and failures

- The first picker selection occurred before the new Expo bundle had replaced the old demo bundle on port 8081. It returned a demo pilav result and was discarded. Metro was reloaded from port 8083 before counting any live result.
- Picker coordinate taps needed a second tap for images 4, 5, and 6; this was a UI selection retry, not a provider retry.
- No completed result displayed a degraded warning or retry state; `results.tsv` records that absence rather than inferring a hidden provider field.
- No source code, fixtures, golden files, baselines, evaluator logic, API key, or gallery photo was modified or committed.

Traps: Never count the discarded port-8081 demo pilav as live evidence. The server's `vision=gemini` health response plus the key-presence check establish the live-provider path, but the key value must never enter a log. Do not call the 180/200 g values visually measured; repeatability shows deterministic catalogue fallback with a visible uncertainty band, not image-derived mass.
