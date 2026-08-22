# Evaluation methodology

This document describes the measurement system that is implemented by
`eval/metrics.py` and rendered by `eval/harness.py`. `make eval` replays the
recorded fixtures offline; the live-provider path is separate as required by
[D4](decisions.md#d4--offline-reproducible-evaluation-via-recorded-fixtures).

## Golden set

Each line in `eval/golden/manifest.jsonl` is one sample. It carries a cuisine
bucket, a conservative overall tier, truth items as `food_id` plus the
harness-compatible numeric `grams` field, and `truth_axes` with separate
identity and portion tiers. Every food ID and mass field carries a provenance
string in the form `dataset=...; record_id=...; field=...`.

The current manifest contains **n=80** samples, with 80 matching recorded
provider fixtures. Generated scorecards replay the complete committed manifest.
The rows are distributed across six cuisine buckets: western 12,
mediterranean 12, east_asian 16, other_mixed 8, south_asian 16, and
latin_american 16. The conservative overall tiers are tier_1 74, tier_2 1,
and tier_3 5.

The conservative overall tier does not hide axis differences:

| Axis/source | Tier | Meaning |
|---|---|---|
| Nutrition5k identity + mass | Tier 1 | Official per-ingredient class/name and scale-weighed grams. |
| Open Food Facts identity | Tier 1 | Product identity and per-100g label fields. |
| Open Food Facts portion | Tier 2 | Printed serving applied as an assumption; eaten mass is not observed. |
| TurkishFoods-15 / UEC-Food 256 identity | Tier 1 | Official class label. |
| TurkishFoods-15 / UEC-Food 256 portion | Tier 3 | Dataset supplies no mass. No plausible gram value is claimed. |
| Two-rater text consensus | Tier 3 | Identity and portion are consensus labels, not instrument measurements. |

For identity-only rows, `grams: 0` is a non-scoring sentinel required by the
current offline harness. It is not source truth and does not mean an empty
portion. `grams_provenance` explicitly records `mass_g (not provided; 0 is
evaluator sentinel)`. Their identity sets are still scored; zero-truth rows
are excluded from calorie APE/MAPE by the existing zero-truth rule. Traps have
empty truth and are scored on identity rather than calorie error.

Nutrition5k rows can also contain `unmapped_source_ingredients`. A non-empty
list means the mapped `truth.items` are only a partial view of the meal: the
mapped calorie sum is retained for inspection but is not complete meal truth.
Such rows are `calorie_eligible = false` and are excluded from calorie APE,
MAPE, and within-20% calculations. They remain in identity, Item F1, coverage,
FP-rate, and error-tag calculations. Incompleteness is never represented by
changing calories to zero.

An error against a Tier 3 label is weaker evidence than the same error against
a Tier 1 label. Tiers are never silently combined: the harness reports the
same evaluation by the conservative overall tier as well as by cuisine, while
the manifest preserves the per-axis distinction for review.

## Headline and per-sample metrics

The headline is the **worst cuisine bucket's MAPE**, followed by the
worst-to-best **spread**. It is not the mean: averaging can hide the market or
cuisine where the system fails, which is the failure this evaluation is meant
to expose. This follows [D3](decisions.md#d3--headline-metric-is-the-worst-cuisine-and-accuracy-is-read-with-coverage).

`spread` is the worst cuisine MAPE divided by the best cuisine MAPE. The
scorecard also prints overall MAPE as secondary context, but it is not the
headline.

Calorie MAPE is computed over **covered, calorie-eligible samples only**. A
sample is covered when it neither abstains nor asks the user for clarification;
a sample is calorie-eligible only when its truth is complete and its total
calories are positive. Coverage is reported next to MAPE because they describe
a risk–coverage trade: a system can lower its error by answering only the cases
it is willing to commit to.
Treating a deferred meal as a zero-calorie answer would punish correct
behaviour, so deferred samples are excluded from calorie MAPE rather than
scored as wrong zeroes. Samples with zero truth calories have no calorie APE;
the trap case is therefore represented by identity metrics. The scorecard's
`Calorie eligible` count is the complete-positive-truth pool before coverage,
and `Calorie scored` is the covered subset that contributes APE/MAPE.

The implemented `Bucket` metrics are:

| Metric | Meaning |
|---|---|
| `precision`, `recall`, `f1` | Set-based identity precision, recall, and F1 over `food_id` |
| `coverage` | Covered samples as a percentage of all samples in the bucket |
| `calorie_eligible` | Count of complete-truth samples with positive calories; partial and zero-truth rows are excluded |
| `calorie_scored` | Count of covered, calorie-eligible rows contributing an APE |
| `mape` | Mean absolute percentage calorie error over `calorie_scored` rows |
| `within_20pct` | `calorie_scored` rows whose calorie error is at most 20% |
| `hallucination_rate` | False positives divided by true positives plus false positives |
| `error_distribution` | Count of observed error tags, once per sample carrying each tag |

The generated scorecard labels `hallucination_rate` as `FP rate`. The precise
boundary is narrower than a blanket impossibility claim:
resolver cannot select a `food_id` outside its candidate set, and no model
emits a nutrition number. The vision stage can still report an item that was
not on the plate; that report may resolve to a real catalogue entry. That
perception failure is what the current V3 `E3` tag counts when it is observable
from the evaluated identity sets.

`aggregate()` produces these per-bucket metrics by cuisine and
`aggregate_by_tier()` applies every one of the same `Bucket` calculations by
ground-truth tier, so every per-bucket headline metric has a tier slice and the
definitions cannot silently diverge. The scorecard prints, for each cuisine
and tier, `n`, coverage, calorie eligibility/scored counts, Item F1, kcal
MAPE, `within_20pct`, and FP rate.

An empty calorie denominator is not a zero-error result. `Bucket.mape` and
`Bucket.within_20pct` retain numeric zero for regression/JSON compatibility,
but format as an em dash in scorecard cells when there are no positive-truth
APE values. A bucket with `coverage > 0%` can still have no calorie score when
its truth is identity-only; a bucket with `coverage = 0%` has no committed
calorie predictions at all. Neither should be read as `0.0%` accuracy.
The regression guard compares only non-empty `calorie_scored` buckets. If a
bucket that had a positive baseline MAPE has no eligible calorie rows now, the
guard reports that as unsafe to compare rather than calling an empty denominator
an accuracy improvement.
In the current V3 table, an em dash means that the bucket has no covered,
positive-truth calorie rows, not a zero-error result. Only the western cuisine
bucket has positive calorie-scored rows; the tier table has one tier_1 and one
tier_2 row in that denominator.

## Current replay and V3 decomposition

The current offline replay on **n=80** produces these ablation rows. V3's
worst-cuisine (`western`) MAPE is **12.7%**, computed over **n=2** covered,
calorie-eligible samples. The V3 coverage is **15%** (**12/80** committed
samples), while **68/80** samples ask for clarification. These are current
outputs of `python eval/harness.py`, not claims about unmeasured provider
behaviour.

| Config | Worst-cuisine MAPE | Mean MAPE | Spread | Coverage | Calorie eligible | Calorie scored | Item F1 | FP rate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| V0 | 100.0% (western) | 100.0% | 1.00x | 100% | 2 | 2 | 0.00 | 100.0% |
| V1 | 12.7% (western) | 12.7% | 1.00x | 49% | 2 | 2 | 0.13 | 89.8% |
| V2 | 12.7% (western) | 12.7% | 1.00x | 49% | 2 | 2 | 0.13 | 89.8% |
| V3 | 12.7% (western) | 12.7% | 1.00x | 15% | 2 | 2 | 0.15 | 86.0% |

The current V3 cuisine slices are:

| Cuisine | n | Coverage | Calorie eligible | Calorie scored | Item F1 | kcal MAPE | within +/-20% | FP rate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| western | 12 | 42% | 2 | 2 | 0.41 | 12.7% | 50.0% | 69.2% |
| mediterranean | 12 | 33% | 0 | 0 | 0.19 | — | — | 78.9% |
| east_asian | 16 | 6% | 0 | 0 | 0.11 | — | — | 89.3% |
| other_mixed | 8 | 0% | 0 | 0 | 0.08 | — | — | 91.7% |
| south_asian | 16 | 0% | 0 | 0 | 0.00 | — | — | 100.0% |
| latin_american | 16 | 12% | 0 | 0 | 0.08 | — | — | 93.5% |
| **overall** | **80** | **15%** | **2** | **2** | **0.15** | **12.7%** | **50.0%** | **86.0%** |

The same V3 calculations by conservative overall tier are:

| Ground-truth tier | n | Coverage | Calorie eligible | Calorie scored | Item F1 | kcal MAPE | within +/-20% | FP rate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| tier_1 | 74 | 11% | 1 | 1 | 0.12 | 25.4% | 0.0% | 89.1% |
| tier_2 | 1 | 100% | 1 | 1 | 1.00 | 0.0% | 100.0% | 0.0% |
| tier_3 | 5 | 60% | 0 | 0 | 0.77 | — | — | 28.6% |
| **overall** | **80** | **15%** | **2** | **2** | **0.15** | **12.7%** | **50.0%** | **86.0%** |

`python eval/decompose_real_error.py` also replays all 80 committed fixtures
without provider calls. Its raw mapped-total output has nine covered rows with
positive mapped calories, but seven are partial-truth rows and therefore are
not calorie-eligible. The harness remains the authority for calorie metrics;
only the two complete rows below enter the scorecard denominator:

| Rank | Sample | APE | Share of summed APE |
|---:|---|---:|---:|
| 1 | n5k_0002 | 25.4% | 100.0% |
| 2 | pkg_0001 | 0.0% | 0.0% |

The seven partial-truth rows that the decomposition helper maps while V3
commits are `n5k_0003`, `n5k_0004`, `n5k_0005`, `n5k_0006`, `n5k_0010`,
`n5k_0016`, and `n5k_0058`. Their mapped calorie totals are diagnostic only;
they are not complete meal truth and must not enter MAPE or within-20%
metrics. The two exact-identity counterfactuals use the complete rows: perfect
identity with observed grams is **12.69% MAPE** (`n=2`), while perfect grams
with observed identity is **0.00% MAPE** (`n=2`). There is no covered identity
mismatch in this replay. Seventy-two manifest rows have partial truth and are
not calorie-eligible; seven of those rows are covered in the current V3 run,
but none enters the APE denominator. The decomposition script's detailed table
shows mapped truth for inspection, not complete meal calories for those rows.

The complete table generated by `python eval/decompose_real_error.py` is
intentionally not pasted here: most of its rows are deferred or have partial
or zero-truth nutrition, so their mapped calorie sums are not complete meal
calories. The two-row distribution above is the honest calorie decomposition
supported by the current data; the helper's seven partial-row APEs are not
evaluation metrics.

### Why V3 answered only 15% of meals

Fresh V3 coverage is **15% of n=80**, so **n=68** samples asked rather than
committed. Classification uses the actual retrieval output and the unchanged
`MIN_ACCEPT_SCORE=0.34` resolver threshold:

| Blocking evidence among n=68 deferred samples | Samples | Meaning |
|---|---:|---|
| At least one perceived food returned no candidate | 41 | Catalogue miss: no matching canonical entry surfaced. |
| At least one candidate existed but best score was below 0.34 | 57 | In-catalogue weak match: resolver abstained below acceptance threshold. |
| Both conditions above | 31 | Mixed blocker; counted in both evidence columns, not double-counted as extra meals. |
| Neither condition | 1 | `trap_0001` empty input; not a food-retrieval failure. |

The mutually exclusive primary decomposition is therefore **10 catalogue-only,
31 mixed catalogue-plus-threshold, 26 threshold-only, and 1 empty** out of
**n=68** deferred samples. Catalogue and threshold blockers both remain
material in this set. Weak candidate surfaces include `home fries` (0.160),
`salade verte` (0.198), `roasted eggplant` (0.304), `corn on the cob` (0.272),
and `noodles with vegetables` (0.187). No
threshold or catalogue change was made for this report.

## Error taxonomy

The taxonomy has twelve `ErrorCode` values, but the harness only derives codes
that are observable from the fields in an evaluated result:

- `E3` — an extra predicted `food_id`;
- `E4` — a truth `food_id` that was missed;
- `E7` — a matched food whose predicted mass differs from truth by more than 30%;
- `E12` — the harness asked for clarification instead of committing.

Identity-based tags apply only when identity is applicable, such as the
closed-set configurations. The remaining causes require human judgement. In
particular, when a mismatch could be `E1`, `E2`, `E9`, `E10`, or `E11`, the
harness represents it as `unclassified`; aggregate fields cannot establish the
cause. A guessed code is worse than no code. A sample with an observable
mismatch also keeps `unclassified` alongside any automatic tag rather than
pretending to know the human cause.

The error-distribution section lists all twelve codes plus `unclassified` and
reports sample counts and their share of tagged samples. It is a distribution
of tags, not a claim that a human reviewed and assigned every specific cause.

For the current V3 replay on **n=80**, the observable tag counts are `E3=61`,
`E4=69`, `E7=11`, `E12=68`, and `unclassified=74`; the other eight codes are
zero. Tags are not mutually exclusive, so these counts do not sum to the
sample count.

## Configurations and regression guard

The offline scorecard compares the four configurations implemented by the
harness:

| Config | What it adds |
|---|---|
| V0 | Single-prompt VLM reporting calories directly |
| V1 | Closed-set resolution and catalogue-computed nutrition |
| V2 | Locale text and unit normalization |
| V3 | Confidence gating and abstention |

Each ablation row reports worst-cuisine MAPE, secondary overall MAPE, spread,
coverage, Item F1, and FP rate. `python eval/harness.py --check-regression`
compares the selected configuration's per-cuisine MAPE with the stored
baseline and fails if any cuisine bucket gets worse.

## Current evidence boundary

The 80 recorded provider responses are real inputs from [#3](../../issues/3),
and this manifest uses source-backed labels where the upstream datasets provide
them. The baseline in `eval/reports/baseline.json` is deliberately retained
unchanged here; this documentation refresh does not reset it. Current
scorecards replay **n=80** and expose complete-positive-truth eligibility
separately from coverage. Seventy-two rows are partial truth and two complete,
positive-truth rows are calorie-eligible; seven partial rows are covered by V3
but remain outside the calorie denominator. Identity-only rows carry Tier 3
portion truth and do not support calorie claims.
