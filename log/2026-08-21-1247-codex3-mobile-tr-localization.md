# Issue #79 — Turkish mobile UI

Agent: `codex3`
Branch: `agent/codex3/mobile-tr-localization`
Claim: #81

## Change

- Added `apps/mobile/src/strings.ts` with typed `tr` and `en` dictionaries, shared `StringKey` union, interpolation, and Turkish default.
- Routed capture, review, day, analysis, navigation, date/time labels, accessibility labels, banners, and known client errors through `t()`.
- Kept food names, queries, source database values, and `g`/`kcal` units from API/demo data.
- Kept API contract and `locale: "tr"` behavior unchanged.

## Verification

- `npm ci` — passed in `apps/mobile`.
- `npm run typecheck` — passed.
- `npx expo export` — passed for iOS and Android bundles.
- `git diff --check` — passed.

## Traps

Do not translate food names, serving units, or backend questions in the client; those are locale-pack/API data. Do not make dictionary entries optional: `Record<StringKey, string>` is what makes a missing `tr` or `en` key a compile error.
