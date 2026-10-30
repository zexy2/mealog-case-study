# Turkish catalogue expansion

- Claim: #89 for issue #83, branch `agent/codex4/tr-catalogue`.
- Added 45 source-backed TÜRKOMP foods to `locale_packs/tr/foods.jsonl`, bringing
  the catalogue from 8 to 53 rows. Every row has a non-empty `source` string;
  new values reference a TÜRKOMP food code or official food page.
- Added `tabak`, `dilim`, `adet`, `fincan`, `orta_boy`, `yarim_porsiyon`,
  `cay_kasigi`, and `yemek_kasigi` to `locale_packs/tr/units.jsonl`. Each unit
  carries exactly one mass or volume conversion and no density.
- Regenerated `STATUS.md`; the derived canonical-food count changed from 24 to
  69 across all locale packs.
- Compared the offline V0/V1/V2/V3 scorecard against `origin/main`: no diff;
  the seeded 9-sample scorecard remains unchanged.
- Gates in a throwaway venv: `make test` (93 passed), `make lint`, harness
  regression, invariants, and status check all passed.

Traps: The first test run selected the new official name “Bulgur, pilavlık” for
the existing `pilav` query. Do not weaken the retrieval test or add an alias;
the display name is intentionally the neutral `Bulgur` while the source string
retains the exact TÜRKOMP descriptor and code. Do not add density to units;
density belongs on a food and only source-backed density values may be recorded.
