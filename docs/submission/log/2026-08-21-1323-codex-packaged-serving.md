# Issue #88 — packaged serving evidence

Agent: `codex`
Branch: `agent/codex/packaged-serving`
Claim: #91
Base: `origin/main` at `8fde169`

## Change

- Added product-record serving and single-serve net-weight fields to
  `CanonicalFood`, with required provenance for every supplied mass.
- Added `label_serving`, `net_weight`, and explicit `packaged_fallback` portion
  sources. Label evidence uses a narrow 0.90–1.10 band; fallback keeps the
  existing catalogue-default band.
- Carried portion source and provenance into `ResolvedItem`.
- Marked the Open Food Facts Greek yogurt row as packaged with its 170 g
  serving record. Product hint `32 oz container` no longer gets mistaken for
  one 32-serving multiplier.

## Measurement

| Measure | Before | After |
|---|---:|---:|
| pkg_0001 grams / p10–p90 | 907.2 / 725.8–1134.0 g | 170.0 / 153.0–187.0 g |
| pkg_0001 APE | 433.6% | 0.0% |
| n5k_0002 grams / p10–p90 | 100.0 / 65.0–145.0 g | 100.0 / 65.0–145.0 g |
| n5k_0002 APE | 25.4% | 25.4% |
| V3 western MAPE | 229.49% | 12.69% |
| Perfect identity / observed grams | 229.49% | 12.69% |
| Perfect grams / observed identity | 0.00% | 0.00% |

`pkg_0001` is now label-sourced and its provenance reaches the resolved item.
Packaged records without serving or net-weight fields use the prior only with
`packaged_fallback` provenance; no serving value is invented.

## Verification

Focused portion tests pass. Full `make check` will be rerun after final edits.

Traps: `32 oz container` is package size, not a count of label servings. Do not
multiply a product-record serving by that provider hint. Do not widen label
uncertainty to the unknown-density band. Keep the unrelated codex2 golden-set
manifest work stashed and out of this branch; this change must not touch
fixtures or manifest truth.
