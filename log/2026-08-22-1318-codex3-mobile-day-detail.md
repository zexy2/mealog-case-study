# Mobile Day saved-meal detail

Agent: `codex3`  
Claim: #182  
Branch: `agent/codex3/mobile-day-detail`  
Base: `29d0ff1` (`origin/main`)

## Change

- Day meal titles now render every resolved item name in existing record order,
  with the query as fallback for abstained items.
- Saved meal rows are pressable and open the existing Review audit surface, so
  all items, grams, ranges, candidates, confidence and expandable trace rows
  remain available.
- Saving a reviewed meal now upserts by `idempotency_key`; opening and leaving a
  saved meal does not append a duplicate.
- Added focused source-contract checks to the existing mobile demo test file.

## Verification

- `npm test` — passed: Turkish locale, demo states, Day title/opening, and
  idempotent replacement checks.
- `npm run typecheck` / `npx tsc --noEmit` — passed.
- `npx expo export --platform android` — passed before clean reinstall.
- Fresh `npm ci` — passed; no dependency or lockfile change.
- macOS export after clean reinstall hit Metro's unrelated
  `Failed to get the SHA-1 for .../@expo/cli/build/metro-require/require.js`.
- Linux Node 22 throwaway container ran clean `npm ci`, `npx tsc --noEmit`, and
  exact CI `npx expo export` — passed for Android and iOS.
- `git diff --check` — passed.
- `python3 scripts/status.py --check` — passed.
- `python3 scripts/check_invariants.py` — passed.
- No device or emulator execution performed.

Traps: `appendMeal` previously deduplicated by returning the old array, which
prevented duplicate rows but also discarded edits to an opened saved meal. Use
replacement at the matching idempotency key, not an unconditional prepend. The
Expo export SHA-1 failure only appeared on macOS after `npm ci`; Linux CI-shaped
container export passed, so do not paper over it by changing Metro or workflow
files. Bundle/typecheck prove buildability, not device execution.
