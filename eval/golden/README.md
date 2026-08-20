# Golden set — labelling protocol

## Rules

1. **One meal per sample.** Multi-item plates stay one sample; decomposition is
   what we are measuring (`E5`/`E6`), not something to pre-solve in the labels.
2. **Every sample carries a tier.** Never mix tiers silently — an error against a
   Tier 3 label is weaker evidence than one against Tier 1.
3. **Truth is grams per `food_id`**, never calories. Calories are derived by the
   same pure function the pipeline uses, so a catalogue fix updates truth and
   prediction together.
4. **Traps are labelled with empty truth.** Correct behaviour is logging nothing.
5. **Record disagreement.** For Tier 3, both raters' values go in `notes`.

## Tiers

| Tier | Source | Procedure |
|---|---|---|
| 1 | packaged label · weighed reference dataset | transcribe; no estimation |
| 2 | self-cooked | weigh each ingredient raw, record cooked mass, compute |
| 3 | restaurant / recalled | two independent raters; consensus; disagreement logged |

## Sampling

Stratify by cuisine bucket **first**, then by difficulty. Do not oversample the
market you can label most easily — that is exactly the bias this project measures.
The Turkish stratum is deep because kitchen-scale Tier 2 truth is available there,
not because it matters more; that reasoning is stated in the write-up so it is not
mistaken for a product focus.

## Adding a sample

1. Add a line to `manifest.jsonl`.
2. Record the provider response: `make eval-live` (writes `fixtures/<sample_id>.json`).
3. `make eval` — confirm it appears in the right bucket.

Fixtures are stamped with provider and `prompt_version`. Re-record when either
changes; a stale fixture is worse than no fixture.
