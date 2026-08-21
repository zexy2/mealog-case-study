# Retrieval fix-forward after 53-food catalogue growth

Claim: #98  
Branch: `agent/codex3/retrieval-53-catalogue`  
Base: `ef7f670` (`origin/main`)

## Change

- Replaced outdated `mantı` and `yoğurt` negative expectations with absent
  Turkish foods `pide` and `şalgam`.
- Kept plain-yoghurt negative aliases off ayran while teaching retrieval that
  an exact positive drink alias outranks a generic negative subphrase; plain
  yoghurt now reaches `tr.yogurt_tam_yagli`.
- Added negative aliases for the catalogue-growth confusions:
  `tr.cay_siyah_kuru`, `tr.yumurta_tavuk`, and `tr.ekmek_beyaz`.
- Retrieval now retains every food attached to the same negative alias and caps
  every documented target below the resolver threshold. This prevents a second
  newly surfaced neighbour from being accepted after the first is capped.
- No `locale_packs/tr/foods.jsonl` change. Brewed tea remains abstained; a
  distinct brewed-tea catalogue entry is a required follow-up for codex4's
  catalogue scope.

## 53-food scorecard

145 variants: 92 positive Turkish, 122 positive overall, 23 negative/confusion.

- Overall: Recall@1 `100.0%`, Recall@5 `100.0%`, MRR `1.000`.
- Per cuisine: `east_asian` 100.0/100.0/1.000 (n=13), `mediterranean`
  100.0/100.0/1.000 (n=92), `western` 100.0/100.0/1.000 (n=17).
- By category: `typo` 100.0/100.0/1.000; `partial` 100.0/100.0/1.000;
  `misspelling` 100.0/100.0/1.000; `colloquial` 100.0/100.0/1.000;
  `quantified` 100.0/100.0/1.000; `regional` 100.0/100.0/1.000;
  `english_mixed` 100.0/100.0/1.000. All other positive categories also
  report 100.0/100.0/1.000.
- Negative guard: blended false accepts `0/22`; all confusion cases surfaced
  their documented neighbour and abstained.

## Verification

`PATH=/tmp/mealog-codex3-84-venv/bin:$PATH make check` passed:

- Ruff: passed.
- Server tests: `249 passed`.
- Architectural invariants: passed.
- `STATUS.md --check`: passed.
- Harness regression: `no per-cuisine regression in V3`.
- Retrieval tests alone: `151 passed`.

Traps: Catalogue growth can leave multiple candidates above the accept threshold;
adding one negative alias is insufficient when the same surface form maps to
several wrong foods. Cap every documented target. Do not add brewed tea to
`foods.jsonl`, do not let a generic plain-yoghurt negative alias override an
exact yoghurt-drink alias, and do not claim catalogue precision stayed unchanged
merely because positive recall stayed at 100%.
