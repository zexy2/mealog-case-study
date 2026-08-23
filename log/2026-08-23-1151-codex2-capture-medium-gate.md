# Capture-medium safety gate

Agent: codex2  
Issue: #239 claim for the capture-medium work  
Base: `origin/main` at `6b05422dfdc4e29d0d77e833637f2c9f5fd7235f`  
Branch: `agent/codex2/capture-medium-gate`

## Changes

- Added the p4 `medium` enum and observation prompt to both Gemini adapters.
- Added `capture_medium` to perceived/resolved items and carried it through
  grounded and ungrounded runners, including reconciliation and corrections.
- Routed every non-`real_plate` value to `ask`, including a perfect single-item
  score/confidence case; `real_plate` remains neutral.
- Added explicit p3-fixture compatibility in both fixture adapters: missing
  `medium` is copied to `real_plate` only at replay time.
- Added Turkish and English cause-specific review copy and an audit-panel row.
- Reinforced the existing occlusion rule for stacked simit rings after a live
  A2 provider variance; no threshold, portion, fixture, catalogue, or baseline
  change was made.

## Verification

- `GEMINI_API_KEY`: present; never printed or written.
- Offline scorecard before and after: SHA-256
  `01af171396e5621c9c8692d862970ed315f6ff54b273f0a47b539a64bac479df` for both
  files; byte comparison exit `0`.
- `eval/reports/baseline.json`: unchanged SHA-256
  `a95e4d1ff2b2d2f377aeaafe0c89d0eb007638af09f7324d237f50adb30da8e6`.
- `make check`: green — ruff, 289 Python tests, architectural invariants,
  status check, and no V3 per-cuisine regression.
- Node: `npm test -- --run` 230/230 and `npm run build` green.
- Mobile: `npm test` and `npm run typecheck` green after installing the
  existing lockfile; no dependency or lockfile change.
- `git diff --check`: green.

## Live evidence

Raw JSON is under `/tmp/mealog-237-before-live/`,
`/tmp/mealog-237-after-live/`, `/tmp/mealog-237-before-guards/`, and
`/tmp/mealog-237-after-guards/`; no raw response was committed.

The six adversarial images were each run three times before and after:

| Input | Clean main, 3/3 | p4 branch, 3/3 |
|---|---|---|
| pen and keys | `ask`, no items | `ask`, no items |
| glass of water | `ask`, ABSTAIN | `ask`, ABSTAIN, `real_plate` |
| empty plate | `ask`, no items | `ask`, no items |
| blurred frame | `ask`, ABSTAIN | `ask`, ABSTAIN, `real_plate` |
| plastic toy food | `ask`, 340.2 kcal, `tr.lahmacun` plus ABSTAIN siblings | `ask`, same resolved item, every item `toy_or_model` |
| pilav on phone screen | `ask`, 271.8 kcal, `tr.pilav` plus ABSTAIN siblings | `ask`, same resolved item, every item `screen` |

The single-item safety rule is separately covered by unit tests with retrieval
score `1` and confidence `1`; it returns `ask` for `screen`.

Four real-food controls each resolved at least one catalogue item on both
branches:

| Photo | Clean main | p4 branch |
|---|---|---|
| `C1.jpg` | `tr.lahmacun`, 340.2 kcal | `tr.lahmacun`, 340.2 kcal, `real_plate` |
| `C5.jpg` | `tr.antep_baklavasi`, 345.6 kcal | same, 345.6 kcal, `real_plate` |
| `C6.jpg` | `tr.ayran`, 74 kcal | same, 74 kcal, `real_plate` |
| `A1.jpg` | `tr.simit`, 329 kcal | same, 329 kcal, `real_plate` |

The issue-specified `/tmp/mealog-adversarial/` directory contained only the six
adversarial PNGs, so these controls used the existing supplied probe images at
`/tmp/mealog-probe-2026-08-22/images/`; this path difference is disclosed rather
than claimed otherwise.

Additional guards: C7 returned exactly one `tr.ayran` on both branches. Clean
main A2 returned `quantity=null`, `catalogue_default`, 65–145 g. The first p4
A2 request showed provider variance (one null result, then two count-2 results),
so the prompt was strengthened with the explicit stacked-ring rule; three
subsequent p4 A2 requests all returned `quantity=null`, `catalogue_default`,
65–145 g. Text kcal values remained 680.4, 271.8, 203.7, current coffee
ABSTAIN/0, 207.0, 658.0, 155.0, and 295.0 before and after.

Traps: Do not default missing `medium` in the live parser or re-record the 80
fixtures. The only compatibility default belongs in the fixture adapter, and
the offline scorecard must stay byte-identical. `real_plate` is absence of a
red flag, never positive evidence; the single-item max-score test is the real
regression guard. The adversarial directory has no real-food controls, so use
the documented probe paths and disclose that fact.
