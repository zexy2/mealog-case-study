# Issue #148 — remove the retrieval fold seam

Agent: `codex5`
Issue: #148
Claim: #160
Branch: `agent/codex5/retrieval-seam`
Base: `origin/main` at `d8a5339`

## Change

- Imported `fold` directly from `src/pipeline/normalize.ts`.
- Replaced the structural retrieval pack with the real `LocalePack` type from
  `src/locales/loader.ts`.
- Removed `RetrievalDeps`, `FoldFn`, and the `createRetrieval({ fold })` seam;
  `createRetrieval()` now uses the shared normalize implementation.
- Updated retrieval fixtures to construct the real `LocalePack` class and kept
  the deterministic `food_id` tie-breaking test unchanged in intent.

## Evidence

The same offline commands were run at the base commit and after the change:

```text
python eval/retrieval_eval.py --out /tmp/mealog-codex5-148-*/retrieval.md
python eval/harness.py --configs V0,V1,V2,V3 --out /tmp/mealog-codex5-148-*/v0-v3.md
```

- Retrieval scorecard: SHA-256
  `4a6050f329c8bf35415fff0d158b2557a90503215b7669a732db13fb14bda3a0`
  before and after; `diff -u` produced zero lines.
- V0–V3 scorecard: SHA-256
  `4ee38f55ee522126699d68b320af7ee038de2092d2fcc547e2cbe3b85ab9ff59`
  before and after; `diff -u` produced zero lines.
- TypeScript: build, lint, full suite (104 tests), and focused retrieval suite
  (29 tests) passed.
- Python merge gate: 249 tests, Ruff, invariants, STATUS check, and V3
  regression guard passed.

## Traps

Do not compare against a hash from an older retrieval PR: the catalogue and
scorecard have moved. Capture both scorecards from the exact branch base and
compare those files after the change. Keep the tie fixture; its cauliflower
ordering is a verified deterministic Python/TypeScript parity case, not a
broken expectation. `npm run build` creates untracked `server/dist/`; remove
that generated directory before checking scope.
