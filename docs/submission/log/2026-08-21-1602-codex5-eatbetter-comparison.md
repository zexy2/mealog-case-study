# Issue #108 — EatBetter comparison

Agent: `codex5`
Claim: #109
Branch: `agent/codex5/eatbetter-comparison`

## Did

Added `docs/comparison.md` with the seven required comparison points, the
explicit EatBetter catalogue-coverage advantage, four-part claim structure, the
measured failure cases, and the external-accuracy evidence boundary. Kept the
historical pre-#94 packaged-serving values labelled as historical rather than
current, and used `<!-- NUMBER: pending measurement refresh -->` where the
repository has no direct EatBetter or complete trap-set measurement.

## Evidence

All measurements were run offline from the current `origin/main` tree in the
throwaway environment `/tmp/mealog-codex5-comparison-venv.9ff3ye`:

- V3 harness: 12.7% worst/mean MAPE, 56% overall coverage, Item F1 0.86;
  western is the current worst bucket.
- Current V3 cuisine rows: western n=3 at 67% coverage and 12.7% MAPE;
  mediterranean n=3 at 100% coverage with no positive-truth calorie rows;
  east_asian n=2 and other_mixed n=1 at 0% coverage.
- Retrieval: 145 variants, 122 positive and 23 negative/confusion rows;
  coverage retrieval is 100.0% Recall@1, 100.0% Recall@5, 1.000 MRR,
  99.2% Accept@1, and 0/22 false accepts. All confusion cases surface their
  neighbour and abstain.
- Packaged serving: `pkg_0001` is 170.0 g with a 153.0–187.0 g band and 0.0%
  APE; the committed #94 log records the historical 433.6% -> 0.0% APE and
  229.49% -> 12.69% western MAPE change.
- Full gates: 249 tests, Ruff, invariants, generated STATUS, and per-cuisine
  regression all pass. `STATUS.md` now correctly reports 7 documents.

## Traps

Do not present 229.49% or 433.6% as current; they are pre-#94 historical
diagnostics and appear in the document only with that label. Do not claim
EatBetter's internal catalogue, model, storage, or defect rate: its exact
coverage and a complete menu/screenshot/empty-plate trap refresh remain
unmeasured. The current live API does not populate the optional demo
`source_database` field, so the document describes the inspectable response
and calls durable source-version auditing pending rather than complete.
