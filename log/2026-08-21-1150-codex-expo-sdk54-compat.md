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
