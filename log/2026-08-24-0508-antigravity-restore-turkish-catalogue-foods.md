# Session Log: 2026-08-24 05:08 - Turkish Catalogue Foods Restoration

## Context & Objectives
- Starting from a clean checkout of `origin/main` at `6b05422`.
- Claim issue: #249 (`[claim] restore four Turkish catalogue foods and tune pizza negative aliases`).
- Restored four valid TURKOMP canonical foods to `locale_packs/tr/foods.jsonl`:
  1. `tr.kofte_izgara` (TURKOMP food code 03.02.0012)
  2. `tr.coban_salatasi` (TURKOMP food code 08.02.0035)
  3. `tr.pizza` (TURKOMP)
  4. `tr.bulgur_pilavi` (TURKOMP)
- Updated `locale_packs/tr/pack.yaml` with `food_count: 57`.
- Restored positive and negative aliases in `locale_packs/tr/aliases.jsonl`:
  - `tr.pizza` negative aliases (`pizza margherita`, `sucuklu yumurta`) prevent spurious matches on out-of-pack dishes.
  - `tr.bulgur_pilavi` negative aliases (`pilav`, `pilavi`, `sade pilav`) preserve canonical routing of bare "pilav" queries to `tr.pilav`.
- Documented Turkish pack provenance and commercial mode enforcement in `docs/assumptions.md` (section A10).
- Regenerated `STATUS.md`.

## Verification Gates
- `pytest tests/test_locale_packs.py tests/test_retrieval.py tests/test_retrieval_eval.py`: 189 passed.
- `pytest -q`: 285 passed.
- `npm test`: 221 passed across 16 files.
- `npm run lint`: 0 errors.
- `ruff check`: All checks passed.
- `scripts/check_invariants.py`: all architectural invariants hold.
- `scripts/status.py --check`: STATUS.md matches the repository.
- `eval/harness.py --check-regression`: no per-cuisine regression in V3.

Traps:
- `tr.bulgur_pilavi` must include bare `pilav` and `pilavi` in its negative aliases, otherwise BM25 document length scoring favors the shorter title of bulgur pilavi over sade pirinc pilavi.
