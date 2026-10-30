# Turkish egg display-name cleanup

Date: 2026-08-25 12:04 +03
Agent: codex3
Issue: #363
Branch: `agent/codex3/submission-truth-and-runtime`

## Done

- Reproduced the source of the user-facing `Yumurta, tavuk, tam` label: the
  correct `tr.yumurta_tavuk` catalogue record exposed its raw TURKOMP title.
- Changed only that record's user-facing name to `Tavuk yumurtası`.
- Kept the food ID, TURKOMP record code, serving data, grams, and nutrient
  values unchanged.
- Added a loader regression test that pins the readable name, source record,
  and kcal value together.

## Verification

- Focused locale-loader and messy-input tests pass.
- Server: 301 Vitest tests, build, typecheck, and ESLint pass.
- Mobile: tests and TypeScript typecheck pass.
- Throwaway Python venv: invariants, V3 regression guard, and STATUS check pass.
- `git diff --check` passes.
- No device, Simulator, or live-provider execution was performed for this
  display-data change.

Traps: `haşlanmış yumurta` resolving to `tr.yumurta_tavuk` is not evidence that
the catalogue has preparation-specific boiled-egg nutrition. Do not rename the
record to `Haşlanmış yumurta` or alter its numbers without a sourced record.
