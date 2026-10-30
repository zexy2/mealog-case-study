# Mobile localization/runtime audit

Agent: `codex5`
Claim: #177
Branch: `agent/codex5/mobile-localization-audit`
Base: `origin/main` at `921662a`

## Audit result

No source-level localization gap was found, so no application or test source
was changed.

- `apps/mobile/src/strings.ts` keeps both `tr` and `en` dictionaries, maps both
  in `dictionaries`, and sets `DEFAULT_LOCALE` to `"tr"`. `t()` defaults to
  that locale.
- Capture/camera/gallery copy, analysis steps, review copy, the `whyResult`
  trace row, abstention copy, error/retry copy, and populated/empty day copy
  all resolve through `t(...)` (or through helpers that do so).
- Dynamic meal, candidate, query, score, date/time, and nutrient values are
  data, not English UI literals. The remaining source literals are protocol or
  locale-neutral display units such as `ABSTAIN`, `g`, `%`, and `kcal`.
- `apps/mobile/app.json` was read-only audited: camera and photo-library
  permission strings remain Turkish.

## Verification

- `npm test` — passed: Turkish runtime locale checks and demo state checks.
- `npm run typecheck` — passed.
- `npx expo export --platform android` — passed; Metro produced a fresh Android
  bundle from the current source.
- `git diff --check` — passed; the working tree remains source-clean.

## Fresh-bundle verification

An English screenshot is therefore most likely a stale Expo/Metro bundle, not a
current dictionary/default-locale failure. From a clean checkout, use:

```text
cd apps/mobile
npm ci
npm test
npm run typecheck
npx expo start --clear
```

Scan the newly printed QR code in Expo Go, fully reload the app, and exercise
capture/gallery, analysis, review, `Nasıl bulundu?`, abstention, error/retry,
and day/empty-day flows. For a deterministic bundle check without a device:

```text
npx expo export --platform android
```

## Traps

Do not delete `en` from `strings.ts`: it is intentionally retained for future
locale selection. Do not treat food names, user queries, provider error
payloads, or numeric units as dictionary keys; they are runtime data or
protocol values. Expo export proves the current source bundles, but only a
`--clear` development server and a newly scanned QR code rule out an old device
bundle.
