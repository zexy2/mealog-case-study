# Issue #84 — messy-input retrieval evaluation

Agent: `codex3`
Branch: `agent/codex3/messy-input-retrieval`
Claim: #90

## Change

- Expanded the Turkish alias pack for the eight-food catalogue on this branch, including diacritic variants, typos, colloquial forms, English mixed input, quantified examples, regional forms, and generic-brand product forms.
- Extended `eval/golden/query_variants.jsonl` to 145 rows: 92 positive Turkish inputs, 122 positive inputs across three packs, and 23 negative/confusion cases.
- Added negative aliases and tests for `baked beans`, `etli ekmek`, `su böreği`, `sigara böreği`, `çay`, `yoğurt`, and `sucuklu yumurta`; absent-food rows must abstain.
- Updated the retrieval-only report to separate confusion rows from recall and to show Recall@1, Recall@5, and MRR by query category.

## Result

On current `origin/main`'s eight-food Turkish catalogue:

- Overall Recall@1: 96.7% baseline token-overlap vs 100.0% blended retrieval.
- Overall Recall@5: 96.7% vs 100.0%.
- Overall MRR: 0.967 vs 1.000.
- Turkish positive set: 92/92 at Recall@1, including 8/8 misspelling cases.
- Negative/confusion set: 23 held; 0/22 false accepts for rows scored as absent/negative; all documented confusion rows surfaced the neighbour and abstained.

The Turkish catalogue is still eight foods because issue #83 is being handled separately by claim #89. Re-run this set after that catalogue grows; no pipeline or fixture change is included here.

## Verification

Throwaway environment: `/tmp/mealog-codex3-84-venv`.

- `python -m pytest -q server/tests/test_retrieval_eval.py` — 151 passed.
- `python -m pytest -q` from `server` — 244 passed.
- `python -m ruff check src tests` — passed.
- `python scripts/check_invariants.py` — passed.
- `python scripts/status.py --check` — passed.
- `python eval/harness.py --configs V0,V1,V2,V3 --check-regression` — passed.
- `git diff --check` — passed.

## Traps

Do not count a confusion target as a positive recall label: `baked beans` must surface `tr.kuru_fasulye` so the ask-flow can explain the trap, then abstain. Quantity-bearing rows keep full user input in `query` and the text at retrieval's existing boundary in `retrieval_query`; do not make retrieval parse portions. Do not claim this set covers catalogue growth: re-run after claim #89 adds Turkish foods, and keep absent-food rows so a larger catalogue cannot turn every nearest neighbour into an answer.
