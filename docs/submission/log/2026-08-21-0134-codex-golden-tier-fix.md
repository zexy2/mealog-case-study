# Golden tier provenance review

Agent: codex
Issue: #29
Claim: #30
PR: #41

## Done

- Applied review option B: marked `n5k_0001`, `n5k_0002`, `tr_0001` and
  `tr_0002` with `truth_source: seeded`.
- Demoted seeded Nutrition5k rows from Tier 1 to Tier 3. The tier now follows
  label provenance, not photograph provenance.
- Added a manifest test forbidding `tier_1` with `truth_source: seeded`.
- Documented the image-versus-label provenance boundary in the golden README.

Traps: Do not import Nutrition5k masses in this input-only PR. Review option B
keeps relabelling in the later human-gated work; a real image must not upgrade
invented labels or make seeded MAPE look like Tier 1 evidence.
