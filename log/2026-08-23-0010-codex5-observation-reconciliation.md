# Observation reconciliation and unknown-count handling

- Agent: codex5
- Issue: #208
- Claim: #209
- Branch: `agent/codex5/observation-reconciliation`
- Base: `5bf4237` (`origin/main`)

## Done

- Reconciled repeated grounded observations by resolved `food_id` in both
  runners. `ABSTAIN` items remain separate so unknown foods are never merged
  away.
- Summed duplicate known quantities; any unknown contribution keeps the merged
  quantity null.
- Recomputed portion and nutrition once after reconciliation. An unknown count
  always uses the unscaled catalogue-default path, even when an uncounted hint
  names a unit. The wide catalogue-default p10-p90 band remains visible.
- Added Python quantity/unit fields to the resolved-item contract so Python and
  TypeScript expose the same count evidence.

## Acceptance evidence

- C7-style four identical `tr.ayran` observations: before 4 items at 200 g;
  after 1 item at 200 g, quantity null.
- F2-style unknown-count `tr.simit`: before 1 item at 100 g with no Python
  quantity field; after 1 item at 100 g, quantity null, catalogue-default
  provenance, and a 65-145 g band.
- Two known `1 adet` simit observations: before 2 items at 100 g each; after 1
  item, quantity 2, at 200 g.
- Different `tr.simit` and `tr.ayran` observations: two items before and after.
- An `en_US` rice input with and without an uncounted `cup` hint: before the
  source changed between `catalogue_default` and `assumed_unit`; after all
  runs use `catalogue_default` with 158 g and a 102.7-229.1 g band.

## Evaluation

The complete V0-V3 scorecards were generated before and after with the same
80-fixture manifest. Both are 171 lines and have SHA-256
`bfb1703b317b2f7f075898606e3e8de21cbc5f986a9bbcb39d9625b06107a65e`; `cmp`
reported no difference. No metric moved. The current committed manifest has no
duplicate resolved food IDs in V0-V3, and the unknown-count fixture already
used the catalogue-default midpoint, so this source-only correction changes
the acceptance envelopes without changing the stored 80-row scorecard. The
stored baseline was not edited.

## Verification

- `make check` in a fresh throwaway virtualenv: pass; 280 Python tests, Ruff,
  invariants, generated STATUS, and V3 regression guard all pass.
- `npm run build`: pass.
- `npm run lint`: pass.
- `npm test -- --reporter=dot`: 216 tests passed.
- `git diff --check`: pass.

Traps: do not merge `ABSTAIN` sentinel items with one another; that drops
distinct unknown foods. Do not treat a unit-bearing hint with no count as a
count of one or as an explicit-unit estimate. Do not change confidence
thresholds, action gating, perception, fixtures, golden labels, baseline,
locale data, or evaluator semantics.
