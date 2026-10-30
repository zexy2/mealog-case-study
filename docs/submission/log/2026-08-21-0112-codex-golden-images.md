# Golden image sourcing session

Agent: codex
Issue: #29
Claim: #30

## Done

- Added standard-library-only `scripts/fetch_golden_images.py`.
- Added source URL, licence, SHA-256 and local filename metadata for all eight
  non-text golden entries. The script supports direct images, Hugging Face row
  APIs and range-based reads from the official UEC-Food archive.
- Sourced Nutrition5k overhead RGB, Open Food Facts, TurkishFoods-15, UEC-Food
  256 and an openly licensed Wikimedia empty plate. No image is tracked; local
  output is `data/golden-images/` and is gitignored.
- Added manifest metadata coverage test and regenerated `STATUS.md`.
- Repointed the stale `runner.py` compatibility TODO from closed #6 to #3.

## Evidence

- `python scripts/fetch_golden_images.py --output-dir /tmp/mealog-golden-final`
  fetched 8 non-text inputs and verified every manifest SHA-256.
- `PATH="/tmp/mealog-codex-20260821/bin:$PATH" make check` passed: 41 tests,
  lint, architectural invariants, status consistency and no per-cuisine
  regression.
- Repository has no tracked image changes and no `eval/reports/baseline.json`
  change.

Traps: This issue supplies inputs only. Do not relabel seeded evaluator truth or
record provider fixtures here; that changes the regression baseline and belongs
to the human-gated follow-up. Do not download the full 4.2 GB UEC archive when
range requests can fetch its directory and selected members. UEC is official
HTTP-only research data, and TurkishFoods/Open Food Facts image terms need the
caveats recorded in the manifest and README.

Branch: `agent/codex/golden-images-pr`
