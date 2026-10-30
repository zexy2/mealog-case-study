# Food density provenance

Agent: `codex4`
Issue: #53
Claim: #59
Branch: `agent/codex4/density-source`

## Change

- Added optional `density_g_per_ml` and paired `density_source` fields to
  `CanonicalFood`; positive densities require a non-empty source string.
- Loaded both fields from food JSONL and made volume conversion read food
  density. Unit definitions remain volume-only.
- Added sourced serving-basis densities for cooked rice and olive oil in
  `en_US`, miso soup in `ja_JP`, and lentil soup and ayran in `tr`.
- Added tests for the narrow known-density interval, unchanged wide fallback,
  source enforcement, and density-free units.

## Evidence

Fresh throwaway venv: `/private/tmp/mealog-codex4-53-venv.Aua95f`

- Focused tests: 13 passed.
- `make check`: 60 tests passed; Ruff, architectural invariants, generated
  STATUS consistency, and the V3 no-per-cuisine-regression guard passed.
- Offline scorecard comparison against `origin/main`:
  V2 worst-cuisine MAPE 26.1% -> 17.3%, mean MAPE 12.1% -> 8.8%, coverage
  100% -> 100%, Item F1 1.00 -> 1.00; V3 worst-cuisine MAPE 26.1% -> 17.3%,
  mean MAPE 11.2% -> 7.4%, coverage 78% -> 78%, Item F1 0.96 -> 0.96.

Traps: Density belongs to `CanonicalFood`, never to a cup, bowl, or other
unit. A missing density keeps the 0.45-1.75 unknown band. A density without a
source is rejected rather than treated as evidence. The seeded scorecard is
still synthetic and does not establish production accuracy.
