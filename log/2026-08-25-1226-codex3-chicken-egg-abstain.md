# Chicken-to-egg false-accept guard

Date: 2026-08-25 12:26 +03
Agent: codex3
Issue: #367
Branch: `agent/codex3/chicken-egg-abstain`

## Finding

A live plate containing chicken meat was shown as `Tavuk yumurtası`. The name
was not the defect: Turkish retrieval scored the unsupported query `tavuk` as
the catalogue record `tr.yumurta_tavuk` at 1.0. With a perceived count of two,
the runner produced 100 g and 140 kcal for egg.

## Done

- Added Turkish negative aliases for generic chicken-meat phrases in Turkish
  and English. No threshold or catalogue food/nutrition row changed.
- Added retrieval tests proving chicken-meat phrases are capped below the
  resolver accept threshold while explicit egg phrases remain exact matches.
- Added an end-to-end runner test proving two pieces of unsupported chicken
  become `ABSTAIN`, zero grams, and zero computed kcal.

## Before / after

- Before: `tavuk` returned `tr.yumurta_tavuk` at score 1.0; two perceived
  pieces became 100 g and 140 kcal.
- After: `tavuk` keeps the egg confusion candidate at score 0.3, resolver
  returns `ABSTAIN`, and no nutrition is computed.

## Verification

- Focused retrieval and runner tests: 49 passed.
- Server: 304 Vitest tests; build, typecheck, and ESLint pass.
- Mobile tests and TypeScript typecheck pass.
- Throwaway Python venv: invariants, V3 regression guard, and STATUS check pass.
- `git diff --check` passes.
- No live-provider rerun, Simulator rerun of the source photo, or physical
  device test was performed after this change.

Traps: Renaming the egg record does not fix chicken-meat retrieval. Do not add
invented chicken nutrition: Turkish catalogue currently has no sourced chicken
meat record, so the honest behavior is `ABSTAIN`. Generic `yumurta` is shared by
multiple catalogue aliases and remains a separate ambiguity finding.
