# Catalogue serving precedence parity

- Issue: #202
- Claim: #204
- Branch: `agent/codex5/portion-unit-resolution`
- Base: `origin/main` at `bbcc6c9` (includes PR #194 merge `9ba5083`)

## Defect and fix

Both portion implementations consulted the generic locale unit table before
checking the food's `default_serving_name`. The fix parses the numeric prefix,
divides `default_serving_g` by that leading count, and uses the result when the
requested unit matches after accent/case folding and treating spaces and
underscores as equivalent. The existing generic unit-table branch remains the
fallback when the catalogue serving names another unit; spreads and source
labels are unchanged apart from the catalogue-serving provenance.

The TypeScript and Python helpers implement the same numeric-prefix forms,
including an integer, decimal, simple fraction, or mixed fraction. The three
regression coincidences remain explicit tests: `tr.simit` 2 adet, `tr.ekmek_beyaz`
3 dilim, and `tr.mercimek_corbasi` 1 kase.

## Acceptance grams and provenance

| Input | Before grams | After grams | After provenance |
|---|---:|---:|---|
| `tr.lahmacun` 2 adet | 200 | 280 | `unit=adet; quantity=2.0; per_unit_g=140; source=catalogue_serving` |
| `tr.yumurta_tavuk` 1 adet | 100 | 50 | `unit=adet; quantity=1.0; per_unit_g=50; source=catalogue_serving` |
| `tr.elma` 1 adet | 100 | 150 | `unit=adet; quantity=1.0; per_unit_g=150; source=catalogue_serving` |
| `tr.yaprak_sarma` 3 adet | 300 | 75 | `unit=adet; quantity=3.0; per_unit_g=25; source=catalogue_serving` |
| `tr.antep_baklavasi` 1 dilim | 25 | 80 | `unit=dilim; quantity=1.0; per_unit_g=80; source=catalogue_serving` |
| `tr.pilav` 1 porsiyon | 250 | 180 | `unit=porsiyon; quantity=1.0; per_unit_g=180; source=catalogue_serving` |
| `tr.ceviz` 1 porsiyon | 250 | 30 | `unit=porsiyon; quantity=1.0; per_unit_g=30; source=catalogue_serving` |
| `tr.turk_kahvesi` 1 fincan | 90 | 7 | `unit=fincan; quantity=1.0; per_unit_g=7; source=catalogue_serving` |
| `tr.simit` 2 adet | 200 | 200 | `unit=adet; quantity=2.0; per_unit_g=100; source=catalogue_serving` |
| `tr.ekmek_beyaz` 3 dilim | 75 | 75 | `unit=dilim; quantity=3.0; per_unit_g=25; source=catalogue_serving` |
| `tr.mercimek_corbasi` 1 kase | 250 | 250 | `unit=kase; quantity=1.0; per_unit_g=250; source=catalogue_serving` |

The fallback test keeps a food whose serving is `1 serving` on the generic
`adet=25 g` table at 50 g for quantity 2, with the original conversion
provenance. Accent/underscore and case matching are covered with `çay kaşığı`
versus `cay_kasigi` and `adet` versus `ADET`.

## Offline scorecard

The clean-main scorecard and post-change scorecard were generated with the same
80 recorded fixtures and configs V0,V1,V2,V3. Both have SHA-256
`bfb1703b317b2f7f075898606e3e8de21cbc5f986a9bbcb39d9625b06107a65e`; `cmp`
reported the files byte-identical. The headline rows remain V0 100.0% MAPE /
100% coverage, V1/V2 12.7% MAPE / 49% coverage, and V3 12.7% MAPE / 15%
coverage, with the same Item F1 and false-positive rates.

## Verification

- TypeScript: build, lint, 16 Vitest files, 207 tests passed.
- Python: Ruff, 275 tests passed.
- `make check` in `/tmp/mealog-codex5-portion-venv`: invariants, current
  `STATUS.md`, and the V3 regression guard passed.
- `git diff --check` passed.

Traps: do not edit locale unit data or baseline files; generic units are only
the fallback. Do not treat unchanged golden metrics as proof that an explicit
unit is correct—the 80-row manifest contains no explicit-unit input, so the
acceptance table is the evidence for this fix.
