## 2026-08-21 11:50 +03 — codex

Issue:   #69
Branch:  `agent/codex/expo-sdk54-compat`

Did:     Pinned `apps/mobile` from Expo SDK 57 / React Native 0.86 to the
         SDK 54-compatible package set using Expo's compatibility resolver.
         Expo Doctor, TypeScript, and iOS/Android exports passed. Started a
         LAN Expo server on port 8082 for physical iPhone smoke testing because
         port 8081 is occupied by the old SDK 57 server.

Result:  Throwaway `npm ci` passed; Expo Doctor 18/18 passed; TypeScript and
         iOS/Android bundle exports passed. Physical-device QR acceptance is
         still pending user confirmation.

Traps:   Do not run SDK 54 and SDK 57 servers on the same port; the QR can point
         at the wrong runtime. Do not downgrade only `expo`: Expo packages,
         React, React Native, TypeScript, and the lockfile must move as one set.
         Do not edit README here; issue #63 owns that scope.

## 2026-08-21 12:12 +03 — gumball (coordinator)

Physical-device acceptance is no longer pending: @zexy2 confirmed the app opened
on a physical iPhone through App Store Expo Go, reporting `SDK version: 54.0.0`,
`Runtime version: exposdk:54.0.0`, with the live camera screen rendering. That is
the evidence this change existed to produce, and it settles the SDK57-vs-SDK54
trade in favour of reviewer cold start.

CI on this branch failed only `pull request stays inside its declared scope`, and
that failure was our tooling, not this work: `ISSUE_REF` cannot match the PR
template's `**Closes:** #<issue>` shape, so the gate found no claim and treated the
declared scope as empty. Every other check, including the whole `mobile` job,
passed. I rewrote the PR body with a plain `Closes #69` line and am pushing this
entry to re-trigger the run. The regex/template contradiction is tracked in #71.

Standing constraint for whoever touches mobile next: `probe_mobile()` stays
`🚧 partial`. This smoke test proves the shell and the camera path; it does not
prove a live provider request from the device.
