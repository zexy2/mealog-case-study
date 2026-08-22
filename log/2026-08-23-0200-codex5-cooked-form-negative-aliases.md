# Cooked-form negative-alias audit

Agent: `codex5`
Claim: #221
Requested issue: #219
Branch: `agent/codex5/cooked-form-negative-aliases`
Base: `origin/main` at `cd0d7b5cdb2118c45d358166381109cdb5abb622`

## State

Implementation complete on the unmerged branch. The coordinator authorized
second-round containment within `locale_packs/tr/`: each cooked surface form is
negatively aliased on the dry/raw target and on the next candidate observed by
the probe. No pipeline, resolver, threshold, evaluator, or baseline file was
edited. No live audit or scorecard was rerun, per issue instructions.

## Evidence

Before the data change, the offline Python resolver produced:

- `haşlanmış makarna` / `haslanmis makarna` → `tr.nohut_haslanmis`
- `haşlanmış bulgur` / `haslanmis bulgur` → `tr.nohut_haslanmis`
- `ezogelin çorbası` → `tr.ezogelin_kuru`
- `haşlanmış mantı` / `haslanmis manti` → `tr.nohut_haslanmis`
- `kadayıf tatlısı` / `kadayif tatlisi` → `tr.tel_kadayif`
- `Türk kahvesi` / `turk kahvesi` → `tr.turk_kahvesi`
- `çay` and `demlenmiş çay` → `ABSTAIN`

After adding only the requested negative aliases to the dry/raw rows:

- makarna variants still resolve to `tr.nohut_haslanmis`
- bulgur variants still resolve to `tr.nohut_haslanmis`
- ezogelin variants resolve to `tr.mercimek_corbasi`
- mantı variants still resolve to `tr.nohut_haslanmis`
- kadayıf tatlısı variants → `ABSTAIN`
- Türk kahvesi variants → `ABSTAIN`
- `çay` and `demlenmiş çay` remain `ABSTAIN`

After the coordinator-authorized second-round aliases, every listed cooked
variant plus `pişmiş makarna` / `pismis makarna` returns `ABSTAIN`. The top
candidates are tied at the documented confusion score (0.3), so no third wrong
entry is reached. `çay` and `demlenmiş çay` remain `ABSTAIN`.

The positive-alias snapshot was unchanged: 93 aliases, digest
`7e0d2b3d2fe3d65449c82270e7bae4152ec1889bb895b4dc4c05e8d0afb1dcdd`, with
0 positive aliases abstaining both before and after. The temporary graph audit
could not classify JSONL files, so it was inconclusive; direct catalogue and
resolver inspection supplied the evidence.

## Verification

- Python retrieval tests: 170 passed; full `make check`: 280 passed.
- Node: `npm test` 216 passed; `npm run build` passed; `npm run lint` passed.
- `make check` in `/tmp/mealog-codex5-portion-venv`: Ruff, invariants, STATUS,
  and the V0–V3 regression guard all passed.
- `git diff --check` passed.

## Scorecard reference

The issue-provided current scorecard reference remains
`bfb1703b317b2f7f075898606e3e8de21cbc5f986a9bbcb39d9625b06107a65e` before and
after. It was not regenerated. `eval/reports/baseline.json` remains unchanged
with reference SHA
`a95e4d1ff2b2d2f377aeaafe0c89d0eb007638af09f7324d237f50adb30da8e6`.

## Traps

The coordinator explicitly authorized negative aliases on `tr.nohut_haslanmis`
and `tr.mercimek_corbasi` as second-round containment for the exact candidates
reached by these cooked phrases; this is still catalogue data only. Do not add a
third containment round if a future probe reaches another candidate: that would
be retrieval scoring and requires a separate decision. Do not rerun the live
audit or regenerate the scorecard, and do not touch `eval/reports/baseline.json`.

## Handoff

State: acceptance passes on the coordinator-authorized two-round containment.
Done: claim opened; aliases added; pre/post offline probes and test evidence
recorded; scorecard reference and baseline hashes unchanged.
Next: review the PR and hosted CI; do not self-merge.
Branch: `agent/codex5/cooked-form-negative-aliases` at the commit containing this
log and the scoped locale data.
