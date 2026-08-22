# en_US catalogue final verification

Agent: `codex`
Issue: #147
Claim: #150
Branch: `agent/codex/en-us-catalogue`
Initial verification base: `origin/main` at `29d0ff1`
Initial verification HEAD: `428261c`

## Scope check

The branch already contained current `origin/main`; `git merge-base --is-ancestor
origin/main HEAD` returned success, so no rebase was needed. The PR diff was limited
to `STATUS.md`, `locale_packs/en_US/foods.jsonl`,
`locale_packs/en_US/aliases.jsonl`, and the catalogue log. No golden labels,
baseline, thresholds, evaluator/Python, mobile, or unrelated catalogue files were
changed.

## Catalogue evidence

- `en_US`: 38 foods total, 30 added over current main's 8.
- Pack metadata: `nutrition_source: USDA FoodData Central` and
  `license: public-domain`.
- USDA provenance: 30/30 added rows have a `source` field containing a USDA FoodData
  Central SR Legacy FDC ID and official dataset URL.
- Aliases: 30/30 added rows have aliases.
- Negative aliases: 12 rows, 23 strings, covering the measured generic/composite
  traps.

## Deferred replay

The offline V3 replay has 80 samples. Current main asks on 75/80 and commits 5/80
(6% coverage); this branch asks on 64/80 and commits 16/80 (20% coverage).
Per-cuisine coverage is western 17% -> 42%, mediterranean 25% -> 42%, east_asian
0% -> 6%, south_asian 0% -> 19%, latin_american 0% -> 12%, and other_mixed
0% -> 0%. Added-food provider observations cover 27/30 added canonical IDs across
44 deferred Nutrition5k samples.

## Retrieval evidence

`python eval/retrieval_eval.py` reports 145 variants, 122 positive inputs, and 23
negative/confusion cases. The blended implementation reports Recall@1 100.0%,
Recall@5 100.0%, MRR 1.000, Accept@1 99.2%, and blended false accepts 0/22
(0.0%). All documented confusion cases pass by surfacing the neighbour and
abstaining.

## Gates

- `make check`: passed; 255 tests, lint, invariants, status, and regression guard.
- `python eval/harness.py --check-regression`: passed.
- `python eval/retrieval_eval.py`: passed.
- No dependency added.

Traps: The shell has no system `python`; use the declared throwaway environment
`/tmp/mealog-codex147.UTTTIM/venv` when reproducing gates. `pack.yaml` has a
pre-existing `food_count: 8` in each locale pack and is outside this claim's
declared files; use the generated STATUS count for actual catalogue size. Do not
turn the partial-truth regression evidence into a label, baseline, threshold, or
evaluator change.

## Rebase follow-up

After the initial verification, `origin/main` advanced to `6c6f14b` through the
mobile day-detail merge. The branch was rebased normally onto that commit. The
rebase encountered stale intermediate catalogue/STATUS/log snapshots from the
branch's published merge history; current `en_US` data and the 80-sample generated
STATUS were retained. The rebased history was reconciled with the published remote
branch using a normal merge, not a force-push. Resulting merge commit: `37dc750`.
