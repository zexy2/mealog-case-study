## 2026-08-21 01:05 +03 — codex3

Issue:   #31; claim #32
Branch:  `agent/codex3/mobile-app`
Commits: `225a170`, `0e9530d` (rebased onto current `main`)
Did:     Added `apps/mobile` as an Expo SDK57 + React Native + TypeScript app
         with exactly three flows: Capture, Review & correct, and Day. Capture
         supports camera, library photo and equal-status text input; analysis
         shows the three pipeline stages. Review renders auto-accept/review/ask,
         portion p10-p90 slider, alternates, and an auditable Why this result
         panel. Day is a meal list with totals. API mode uses multipart
         `POST /v1/meals`; default demo mode works without a key. Pending
         captures persist in AsyncStorage and retry with the same idempotency key.
         `probe_mobile()` now requires structured Expo execution proof, not a
         package.json. README documents the QR/demo/API run paths.
Result:  Expo Doctor 21/21. `npm run typecheck`, Android and iOS Expo exports,
         localhost Expo manifest, `make check`, generated STATUS check, 25
         backend tests, Ruff, invariants and V3 regression guard passed.
Next:    Rebase onto current `main`, push, open PR, read CI, then comment on #31
         after merge.
Traps:   Expo SDK57 bundles React Native 0.86.2; RN 0.87.0 made Metro export
         fail with missing `rn-get-polyfills`. Run `npx expo-doctor` after every
         native dependency change. Do not mark mobile working from package
         presence; the status probe requires `verification/expo-execution.json`.
         Do not add server changes to make the app demo work.
