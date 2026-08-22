# Session log — explicit vision count provenance

Agent: `codex2`
Issue: #218
Branch: `agent/codex2/vision-explicit-count`

## Work completed

- Reproduced the pre-fix A2 failure: one `tr.simit`, quantity `1`,
  `catalogue_default_scaled`, 75–135 g; C7 reproduced four perceived items
  before the guard.
- Added nullable integer `count` to the Gemini response schema, p3 prompt
  rules for distinct visibility and occlusion, and count-origin propagation
  through Node and Python perception, normalization, portion, correction, and
  confidence stages.
- Numeric `portion_hint` parsing remains on the existing user-text path only.
  Vision hints do not create `explicit_unit` portions.
- Re-recorded all 80 fixtures with `gemini-flash-lite-latest`, p3, 4-second
  pacing: 80 recorded, 0 skipped, 80 requests. All fixture prompt versions
  are p3; 79 are vision and 1 is user text; no numeric portion hints remain.
- Added a conservative adapter rule: a visual count of one is not explicit
  quantity evidence, and container hints cannot create a count. This prevents
  the A2 provider guess from becoming quantity 1 while retaining count >= 2
  when the provider reports multiple visible instances.

## Verification

- Node: 16 test files, 221 tests passed; ESLint passed; TypeScript build passed.
- Python throwaway venv: focused vision/normalize/portion/confidence tests 59
  passed; `make check`: 285 tests passed, ruff passed, invariants passed,
  STATUS check passed, V3 regression guard passed.
- `git diff --check` passed.
- Baseline SHA before and after: `a95e4d1ff2b2d2f377aeaafe0c89d0eb007638af09f7324d237f50adb30da8e6`.
  `eval/reports/baseline.json` is unchanged.
- Live NestJS with Gemini: eight text guards returned exactly 680.4, 271.8,
  203.7, 19.5, 207.0, 658.0, 155.0, and 295.0 kcal. C7 returned exactly one
  `tr.ayran`. A2 returned one `tr.simit`, quantity null,
  `catalogue_default`, 65–145 g on three requests with identical p10/p90.
  One mercimek request returned HTTP 503; one retry returned 155 kcal.

## Separate V3 deltas

These are generated offline from the current pipeline after rebasing onto
`origin/main` at `cf23d160e65d302d44619b032f30e3225a6ee7e1`, not the committed
baseline. Delta 1 uses the old p2 fixtures from current origin/main with the
new pipeline; Delta 2 uses the fresh p3 fixtures with the same logic.

| Delta | Fixture input | Coverage | Calorie eligible/scored | Item F1 | FP rate | kcal MAPE | Scorecard SHA |
|---|---|---:|---:|---:|---:|---:|---|
| 1 | old p2 | 15% | 2 / 2 | 0.15 | 86.0% | 12.7% | `763df806a72677b5aab9d4ad6c951d2600ca2830a8c3501a7f1a343089957a2b` |
| 2 | fresh p3 | 12% | 2 / 2 | 0.15 | 86.0% | 12.7% | `861982e281539b3989a7b4ade9d72bf8c9a970466cbc2f51f25e1c57133cac76` |

The provider freshness delta is therefore coverage -3 percentage points; the
rounded V3 identity/FP/calorie metrics are unchanged. The p3 scorecard is at
`/tmp/mealog-218-delta-p3-new-pipeline-current.md`; the p2 scorecard is at
`/tmp/mealog-218-delta-p2-current/eval/reports/delta1-p2-new-pipeline.md` in
the local verification environment.

Traps: Do not treat a provider count of 1 from a stacked/occluded photo as
explicit quantity; the A2 provider returned exactly that guess. Do not parse
numeric vision `portion_hint`, do not reset the baseline, and do not call
`make check` from a contaminated Python environment. The Gemini key was kept
only in process environment and never printed or written.
