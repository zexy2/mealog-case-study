# iOS Simulator smoke — merged PR #183

Agent: codex3  
Claim: #186  
Branch: `agent/codex3/ios-simulator-smoke`  
Base: `6c6f14b685867dd3bacd51af39bf36c530cc975b` (PR #183 merge)  
Device: iPhone Air, iOS 26.5, UDID `E7332C18-A830-4802-8E40-51882E829F17`  
Expo: SDK 54 (`expo` `~54.0.0`), Expo Go, Metro on port 8083

## Evidence

- `git fetch origin main` completed; PR #183 is merged and `6c6f14b` is an ancestor of `origin/main`.
- Fresh runtime worktree was clean at start and after the smoke run.
- Xcode `26.6` / build `17F113`; `xcrun simctl` available; iPhone Air booted.
- `npm ci` completed in `apps/mobile`.
- Started `EXPO_PUBLIC_DEMO_MODE=true npx expo start --clear --ios`. Port 8081 was occupied by another Expo process, so Expo selected 8083 after confirmation.
- All runtime evidence below is demo-mode evidence. No live provider, API key, user photo, fixture, golden file, baseline, or evaluator path was used.

Screenshots captured with `xcrun simctl io E7332C18-A830-4802-8E40-51882E829F17 screenshot`:

- `/tmp/mealog-ios-smoke-demo-review.png`
- `/tmp/mealog-ios-smoke-demo-review-audit.png`
- `/tmp/mealog-ios-smoke-day-after-save.png`
- `/tmp/mealog-ios-smoke-day-after-resave.png`
- `/tmp/mealog-ios-smoke-demo-abstain.png`
- `/tmp/mealog-ios-smoke-demo-degraded.png`
- `/tmp/mealog-ios-smoke-demo-empty.png`

## Results

- Single-item demo review opened in Simulator. Turkish UI rendered.
- Review showed `Sade pirinc pilavi`, `tr.pilav`, TURKOMP, 78% identity confidence, `180 g`, p10–p90 `140–230 g`, candidate alternatives, and expanded `Nasıl bulundu?` audit details.
- Saved meal appeared on Day. Tapping its saved row reopened the existing Review audit.
- Saving the opened meal again returned to Day with `2 kayıt`, not a third row. Duplicate prevention passed for this single-item path.
- Abstain demo rendered `ABSTAIN · TAHMİN YOK` with nearest candidates and no estimate.
- Degraded demo rendered the weak-evidence/provider-fallback warning and remained reviewable.
- Empty-day demo rendered its intentional empty state and add action.

## Limitation

The current keyless demo data has one item per meal (`simit`, `pilav`, or `ABSTAIN`); it has no deterministic multi-item saved meal. Therefore this run does **not** prove the required simit + ayran multi-item Day display or preservation of multi-item audit data. Live-provider execution was not attempted because no API key or live result was available. Device execution is proven only for the reachable demo flows above; no CI, typecheck, or export result is treated as device proof.

Traps: Do not call the two separate Day rows a multi-item meal. The exact demo command opens a single-item fixture, so a real simit + ayran provider result needs a later device run with a safe deterministic source. Do not use golden fixtures or invent live-provider evidence to close this gap.
