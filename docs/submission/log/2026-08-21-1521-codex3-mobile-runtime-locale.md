# Mobile runtime locale investigation

- Claim: issue #103, branch `agent/codex3/mobile-runtime-locale`, based on `origin/main` at `263c159`.
- Scope: `apps/mobile/` and `log/` only.

## Finding

The locale initialization was not the cause: `apps/mobile/src/strings.ts` already sets `DEFAULT_LOCALE` to `tr`, and the ordinary screen labels call `t()` without an explicit locale. Two user-visible paths bypassed that default:

1. `Review.tsx` rendered the API/demo `meal.question` directly. The demo fixture created an English question (`Is this kuru fasulye, or another bean dish?`), and the server can provide the same English framing for an `ask` result.
2. `app.json` contained English iOS camera/photo-library usage descriptions and Expo permission-plugin messages. These are copied into the SDK54 native permission prompts during export, so changing the JS dictionary alone cannot translate them.

`npx expo export --platform ios` succeeded before and after the fix. `npx expo config --json` exposed the pre-fix English permission strings and the post-fix Turkish values. No device or iPhone recording was used.

## Changes

- Localized the iOS and Expo camera/photo-library permission strings in `app.json`.
- Added typed Turkish/English question framing and made the review screen derive that framing from candidate data instead of displaying a provider question verbatim. Food names remain catalogue/API data.
- Added a focused mobile test for the Turkish default, required translations, question fallback, and native permission configuration; exposed it as `npm test`.

## Verification

- `npm ci`
- `npm test`
- `npm run typecheck`
- `npm run verify`
- `npx expo export --platform ios`
- `make test` — 249 passed
- `make lint` — clean
- `python scripts/check_invariants.py` — pass
- `python scripts/status.py --check` — pass
- `python eval/harness.py --configs V0,V1,V2,V3 --check-regression` — no per-cuisine regression in V3

No nutrition, retrieval, golden-set, or evaluation metric changed. Device runtime remains unverified.

Traps: `DEFAULT_LOCALE = "tr"` does not protect raw provider/demo strings or native permission text. Do not translate food names or units in the client; those are locale-pack data. Do not treat a successful Expo export as iPhone/device testing evidence.
