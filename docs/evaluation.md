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

The current scorable golden-sample count is intentionally left pending until the
settled manifest is measured. <!-- NUMBER: pending measurement refresh -->

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

Calorie MAPE is computed over **covered samples only**. A sample is covered
when it neither abstains nor asks the user for clarification. Coverage is
reported next to MAPE because they describe a risk–coverage trade: a system
can lower its error by answering only the cases it is willing to commit to.
Treating a deferred meal as a zero-calorie answer would punish correct
behaviour, so deferred samples are excluded from calorie MAPE rather than
scored as wrong zeroes. Samples with zero truth calories have no calorie APE;
the trap case is therefore represented by identity metrics.

The implemented `Bucket` metrics are:

| Metric | Meaning |
|---|---|
| `precision`, `recall`, `f1` | Set-based identity precision, recall, and F1 over `food_id` |
| `coverage` | Covered samples as a percentage of all samples in the bucket |
| `mape` | Mean absolute percentage calorie error over covered samples with positive truth calories |
| `within_20pct` | Covered samples whose calorie error is at most 20% |
| `hallucination_rate` | False positives divided by true positives plus false positives |
| `error_distribution` | Count of observed error tags, once per sample carrying each tag |

The generated scorecard labels `hallucination_rate` as `FP rate`. The code's
caveat is important: a false positive means a hallucination only after
resolution is closed-set. Before that, it is a wrong free-text guess, not a
closed-set hallucination finding.

`aggregate()` produces these per-bucket metrics by cuisine and
`aggregate_by_tier()` applies every one of the same `Bucket` calculations by
ground-truth tier, so every per-bucket headline metric has a tier slice and the
definitions cannot silently diverge. The scorecard prints, for each cuisine
and tier, `n`, coverage, Item F1, kcal MAPE, `within_20pct`, and FP rate.

An empty calorie denominator is not a zero-error result. `Bucket.mape` and
`Bucket.within_20pct` retain numeric zero for regression/JSON compatibility,
but format as an em dash in scorecard cells when there are no positive-truth
APE values. A bucket with `coverage > 0%` can still have no calorie score when
its truth is identity-only; a bucket with `coverage = 0%` has no committed
calorie predictions at all. Neither should be read as `0.0%` accuracy.
In the current V3 table, `mediterranean` is `n=3` with 100% coverage but
zero positive-truth calorie rows; `east_asian` is `n=2` with 0% coverage; and
`other_mixed` is `n=1` with 0% coverage. Their former `0.0%` cells were not
three real accuracy results.

## Real nine-sample error decomposition

The headline is pending measurement refresh. <!-- NUMBER: pending measurement refresh --> It is not a nine-sample mean. It is the worst cuisine
(`western`) MAPE over **n=2** covered samples with positive-calorie truth.
`n5k_0001` asked for clarification, and the five identity-only rows carry no
calorie truth. The complete offline table is generated by
`server/.venv/bin/python eval/decompose_real_error.py` from the committed
fixtures and manifest; it performs no provider calls and changes no pipeline
decision.

| Sample | Provider reported | Retrieval proposed (score) | Resolution | Predicted grams (p10–p90) | Truth grams (tier) | kcal predicted / truth | APE | E-code |
|---|---|---|---|---|---|---:|---:|---|
| n5k_0001 | breaded chicken breast (breaded and fried)<br>white rice (boiled)<br>broccoli (steamed)<br>spinach (raw) | breaded chicken breast → us.chicken_breast_grilled [0.681]<br>white rice → us.rice_white_cooked [1.000]<br>broccoli → none<br>spinach → none | breaded chicken breast → us.chicken_breast_grilled<br>white rice → us.rice_white_cooked<br>broccoli → ABSTAIN<br>spinach → ABSTAIN<br>route=ask | us.chicken_breast_grilled: 120.0 (78.0–174.0)<br>us.rice_white_cooked: 158.0 (102.7–229.1) | us.chicken_breast_grilled: 120.7<br>us.rice_white_cooked: 106.0<br>tier=tier_1 | 403.4 / 337.0 | — (not covered) | E12, E7, unclassified |
| n5k_0002 | scrambled eggs (scrambled) | scrambled eggs → us.eggs_scrambled [1.000] | scrambled eggs → us.eggs_scrambled<br>route=auto_accept | us.eggs_scrambled: 100.0 (65.0–145.0) | us.eggs_scrambled: 134.0<br>tier=tier_1 | 149.0 / 199.7 | 25.4% | — |
| pkg_0001 | Greek yogurt (none) | greek yogurt → us.yogurt_greek_plain [0.939] | greek yogurt → us.yogurt_greek_plain<br>route=auto_accept | us.yogurt_greek_plain: <!-- NUMBER: pending measurement refresh --> | us.yogurt_greek_plain: 170.0<br>tier=tier_2 | <!-- NUMBER: pending measurement refresh --> / 100.3 | <!-- NUMBER: pending measurement refresh --> | — |
| tr_0001 | etli kuru fasulye (boiled) | <!-- NUMBER: pending measurement refresh --> | etli kuru fasulye → tr.kuru_fasulye<br>route=auto_accept | tr.kuru_fasulye: 250.0 (187.5–337.5) | tr.kuru_fasulye: 0.0<br>identity-only sentinel<br>tier=tier_3 | 295.0 / 0.0 | — (zero-truth) | — |
| tr_0002 | simit (baked) | simit → tr.simit [1.000] | simit → tr.simit<br>route=auto_accept | tr.simit: 100.0 (65.0–145.0) | tr.simit: 0.0<br>identity-only sentinel<br>tier=tier_3 | 329.0 / 0.0 | — (zero-truth) | — |
| tr_0003 | simit (baked)<br>ayran | simit → tr.simit [1.000]<br>ayran → tr.ayran [1.000] | simit → tr.simit<br>ayran → tr.ayran<br>route=auto_accept | tr.simit: 100.0 (75.0–135.0)<br>tr.ayran: 200.0 (150.0–270.0) | tr.simit: 0.0<br>tr.ayran: 0.0<br>identity-only sentinel<br>tier=tier_3 | 403.0 / 0.0 | — (zero-truth) | — |
| jp_0001 | salmon (grilled)<br>gohan (steamed)<br>miso soup (boiled)<br>tomato salad (raw)<br>tsukemono (pickled) | salmon → jp.salmon_grilled [1.000]<br>gohan → jp.rice_steamed [1.000]<br>miso soup → jp.miso_soup [1.000]<br>tomato salad → none<br>tsukemono → none | salmon → jp.salmon_grilled<br>gohan → jp.rice_steamed<br>miso soup → jp.miso_soup<br>tomato salad → ABSTAIN<br>tsukemono → ABSTAIN<br>route=ask | jp.salmon_grilled: 80.0 (60.0–108.0)<br>jp.rice_steamed: 200.0 (90.0–350.0)<br>jp.miso_soup: 200.0 (160.0–250.0) | jp.rice_steamed: 0.0<br>identity-only sentinel<br>tier=tier_3 | 579.2 / 0.0 | — (zero-truth) | E12, E3, unclassified |
| jp_0002 | 炸排骨 (fried)<br>排骨飯 (fried)<br>菜 (stir-fried) | 炸排骨 → none<br>排骨飯 → none<br>菜 → none | 炸排骨 → ABSTAIN<br>排骨飯 → ABSTAIN<br>菜 → ABSTAIN<br>route=ask | — | jp.tonkatsu: 0.0<br>identity-only sentinel<br>tier=tier_3 | 0.0 / 0.0 | — (zero-truth) | E12, E4, unclassified |
| trap_0001 | — (empty) | — | —<br>route=ask | — | — (empty truth) | 0.0 / 0.0 | — (zero-truth) | E12 |

`E-code` is derived only from observable fields. `unclassified` deliberately
remains beside E3/E4/E7 where the aggregate cannot establish the more specific
cause. In particular, `pkg_0001` is a portion error, not evidence that the
catalogue entry itself is wrong.

### APE distribution and counterfactuals

| Rank | Sample | APE | Share of summed APE |
|---:|---|---:|---:|
| <!-- NUMBER: pending measurement refresh --> | pkg_0001 | <!-- NUMBER: pending measurement refresh --> | <!-- NUMBER: pending measurement refresh --> |
| <!-- NUMBER: pending measurement refresh --> | n5k_0002 | 25.4% | <!-- NUMBER: pending measurement refresh --> |

The two counterfactuals use the same covered, positive-calorie denominator and
require exact identity alignment. They do not invent grams for identity-only
truth or apply truth mass to an unrelated food.

| Counterfactual | MAPE | n | Eligible samples |
|---|---:|---:|---|
| Perfect identity; observed grams only | <!-- NUMBER: pending measurement refresh --> | 2 | n5k_0002, pkg_0001 |
| Perfect grams; observed identity only | 0.00% | 2 | n5k_0002, pkg_0001 |

No covered positive-calorie row has an identity mismatch. Therefore the
observed calorie error is portion-dominated on the only two scorable rows, but
the current nine-sample set cannot estimate identity-only calorie error: five
rows have identity-only truth, one is empty, and two are deferred or
uncovered. The immediate evidence-based improvement is portion/quantity
handling for packaged servings, especially `pkg_0001`; catalogue expansion for
the abstained Japanese and vegetable forms is a separate coverage problem.

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

The nine recorded provider responses are real inputs from [#3](../../issues/3),
and this manifest now uses source-backed labels where the upstream datasets
provide them. The first baseline with both real inputs and real labels is
reset in `eval/reports/baseline.json`; earlier values were harness validation
against seeded truth. The label set remains small (`n=9`), and five rows have
identity-only truth: their portion axis is Tier 3 and contributes no calorie
claim. Read the unedited worst-cuisine MAPE beside coverage, axis tiers and
this mass-evidence boundary. [#2](../../issues/2) still owns golden-set growth.
