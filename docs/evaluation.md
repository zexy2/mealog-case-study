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

The current manifest contains **n=80** samples. The historical 25-sample
decomposition below is labelled explicitly; generated scorecards always replay
the complete committed manifest.

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
perception failure is what `E3` counted in the historical V3 run on **n=25**.

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
In the historical V3 table on **n=25**, `mediterranean` has `n=6` and 50% coverage,
`east_asian` has `n=5` and 0% coverage, and `other_mixed` has `n=2` and 0%
coverage. An em dash in their calorie cells means no positive-truth covered
rows, not a zero-error result.

## Real 25-sample error decomposition

Fresh V3 on **n=25** has worst-cuisine (`western`) MAPE **12.7%**, computed
over **n=2** covered samples with positive-calorie truth. This is a direction,
not an estimate: sixteen added samples did not add scorable calorie rows. The
complete table below is generated by `python eval/decompose_real_error.py` from
the committed fixtures and manifest; it performs no provider calls and changes
no pipeline decision.

| Sample | Provider reported | Retrieval proposed (score) | Resolution | Predicted grams (p10–p90) | Truth grams (tier) | kcal predicted / truth | APE | E-code |
|---|---|---|---|---|---|---:|---:|---|
| n5k_0001 | breaded chicken breast (breaded and fried)<br>white rice (boiled)<br>broccoli (steamed)<br>spinach (raw) | breaded chicken breast → us.chicken_breast_grilled [0.681]<br>white rice → us.rice_white_cooked [1.000]<br>broccoli → none<br>spinach → none | breaded chicken breast → us.chicken_breast_grilled<br>white rice → us.rice_white_cooked<br>broccoli → ABSTAIN<br>spinach → ABSTAIN<br>route=ask | us.chicken_breast_grilled: 120.0 (78.0–174.0)<br>us.rice_white_cooked: 158.0 (102.7–229.1) | us.chicken_breast_grilled: 120.7<br>us.rice_white_cooked: 106.0<br>tier=tier_1 | 403.4 / 337.0 | — (not covered) | E12, E7, unclassified |
| n5k_0002 | scrambled eggs (scrambled) | scrambled eggs → us.eggs_scrambled [1.000] | scrambled eggs → us.eggs_scrambled<br>route=auto_accept | us.eggs_scrambled: 100.0 (65.0–145.0) | us.eggs_scrambled: 134.0<br>tier=tier_1 | 149.0 / 199.7 | 25.4% | — |
| pkg_0001 | Greek yogurt (none) | greek yogurt → us.yogurt_greek_plain [0.939] | greek yogurt → us.yogurt_greek_plain<br>route=auto_accept | us.yogurt_greek_plain: 170.0 (153.0–187.0) | us.yogurt_greek_plain: 170.0<br>tier=tier_2 | 100.3 / 100.3 | 0.0% | —|
| tr_0001 | etli kuru fasulye (boiled) | etli kuru fasulye → tr.kuru_fasulye [1.000], tr.fasulye_kuru [0.496], tr.cay_siyah_kuru [0.164], tr.ceviz [0.164], tr.ezogelin_kuru [0.164] | etli kuru fasulye → tr.kuru_fasulye<br>route=auto_accept | tr.kuru_fasulye: 250.0 (187.5–337.5) | tr.kuru_fasulye: 0.0<br>identity-only sentinel<br>tier=tier_3 | 295.0 / 0.0 | — (zero-truth) | —|
| tr_0002 | simit (baked) | simit → tr.simit [1.000] | simit → tr.simit<br>route=auto_accept | tr.simit: 100.0 (65.0–145.0) | tr.simit: 0.0<br>identity-only sentinel<br>tier=tier_3 | 329.0 / 0.0 | — (zero-truth) | — |
| tr_0003 | simit (baked)<br>ayran | simit → tr.simit [1.000]<br>ayran → tr.ayran [1.000] | simit → tr.simit<br>ayran → tr.ayran<br>route=auto_accept | tr.simit: 100.0 (75.0–135.0)<br>tr.ayran: 200.0 (150.0–270.0) | tr.simit: 0.0<br>tr.ayran: 0.0<br>identity-only sentinel<br>tier=tier_3 | 403.0 / 0.0 | — (zero-truth) | — |
| jp_0001 | salmon (grilled)<br>gohan (steamed)<br>miso soup (boiled)<br>tomato salad (raw)<br>tsukemono (pickled) | salmon → jp.salmon_grilled [1.000]<br>gohan → jp.rice_steamed [1.000]<br>miso soup → jp.miso_soup [1.000]<br>tomato salad → none<br>tsukemono → none | salmon → jp.salmon_grilled<br>gohan → jp.rice_steamed<br>miso soup → jp.miso_soup<br>tomato salad → ABSTAIN<br>tsukemono → ABSTAIN<br>route=ask | jp.salmon_grilled: 80.0 (60.0–108.0)<br>jp.rice_steamed: 200.0 (90.0–350.0)<br>jp.miso_soup: 200.0 (160.0–250.0) | jp.rice_steamed: 0.0<br>identity-only sentinel<br>tier=tier_3 | 579.2 / 0.0 | — (zero-truth) | E12, E3, unclassified |
| jp_0002 | 炸排骨 (fried)<br>排骨飯 (fried)<br>菜 (stir-fried) | 炸排骨 → none<br>排骨飯 → none<br>菜 → none | 炸排骨 → ABSTAIN<br>排骨飯 → ABSTAIN<br>菜 → ABSTAIN<br>route=ask | — | jp.tonkatsu: 0.0<br>identity-only sentinel<br>tier=tier_3 | 0.0 / 0.0 | — (zero-truth) | E12, E4, unclassified |
| trap_0001 | — (empty) | — | —<br>route=ask | — | — (empty truth) | 0.0 / 0.0 | — (zero-truth) | E12 |
| n5k_0003 | scrambled eggs (scrambled)<br>roasted potatoes (roasted)<br>roasted broccoli (roasted)<br>strawberries (raw)<br>blueberries (raw)<br>pineapple (raw) | scrambled eggs → us.eggs_scrambled [1.000]<br>roasted potatoes → none<br>roasted broccoli → none<br>strawberries → none<br>blueberries → none<br>pineapple → none | scrambled eggs → us.eggs_scrambled<br>roasted potatoes → ABSTAIN<br>roasted broccoli → ABSTAIN<br>strawberries → ABSTAIN<br>blueberries → ABSTAIN<br>pineapple → ABSTAIN<br>route=ask | us.eggs_scrambled: 100.0 (65.0–145.0) | us.olive_oil: 0.9<br>us.eggs_scrambled: 147.0<br>tier=tier_1 | 149.0 / 227.0 | — (not covered) | E12, E4, E7, unclassified|
| n5k_0004 | grapes (raw)<br>sweet potato (roasted)<br>scrambled eggs (scrambled)<br>cheese (none)<br>pineapple (raw) | grapes → none<br>sweet potato → none<br>scrambled eggs → us.eggs_scrambled [1.000]<br>cheese → us.cheddar_cheese [1.000]<br>pineapple → none | grapes → ABSTAIN<br>sweet potato → ABSTAIN<br>scrambled eggs → us.eggs_scrambled<br>cheese → us.cheddar_cheese<br>pineapple → ABSTAIN<br>route=ask | us.eggs_scrambled: 100.0 (65.0–145.0)<br>us.cheddar_cheese: 28.0 (18.2–40.6) | us.eggs_scrambled: 68.0<br>us.olive_oil: 6.0<br>tier=tier_1 | 261.8 / 154.4 | — (not covered) | E12, E3, E4, E7, unclassified|
| n5k_0005 | watermelon (raw)<br>pineapple (raw)<br>raspberries (raw)<br>blackberries (raw)<br>sweet potato (roasted)<br>scrambled eggs (scrambled) | watermelon → none<br>pineapple → none<br>raspberries → none<br>blackberries → none<br>sweet potato → none<br>scrambled eggs → us.eggs_scrambled [1.000] | watermelon → ABSTAIN<br>pineapple → ABSTAIN<br>raspberries → ABSTAIN<br>blackberries → ABSTAIN<br>sweet potato → ABSTAIN<br>scrambled eggs → us.eggs_scrambled<br>route=ask | us.eggs_scrambled: 100.0 (65.0–145.0) | us.eggs_scrambled: 65.0<br>us.olive_oil: 1.9<br>tier=tier_1 | 149.0 / 113.2 | — (not covered) | E12, E4, E7, unclassified|
| n5k_0006 | broccoli (steamed)<br>breaded chicken cutlet (baked)<br>apple (raw)<br>roasted squash (roasted) | broccoli → none<br>breaded chicken cutlet → us.chicken_breast_grilled [0.352]<br>apple → us.apple_raw [0.863]<br>roasted squash → none | broccoli → ABSTAIN<br>breaded chicken cutlet → us.chicken_breast_grilled<br>apple → us.apple_raw<br>roasted squash → ABSTAIN<br>route=ask | us.chicken_breast_grilled: 120.0 (78.0–174.0)<br>us.apple_raw: 182.0 (118.3–263.9) | us.chicken_breast_grilled: 89.5<br>us.olive_oil: 1.0<br>tier=tier_1 | 292.6 / 156.3 | — (not covered) | E12, E3, E4, E7, unclassified|
| n5k_0007 | green salad (raw)<br>blueberries (raw)<br>Brussel sprouts (roasted)<br>kale (cooked) | green salad → none<br>blueberries → none<br>brussel sprouts → none<br>kale → none | green salad → ABSTAIN<br>blueberries → ABSTAIN<br>brussel sprouts → ABSTAIN<br>kale → ABSTAIN<br>route=ask | — | us.olive_oil: 9.9<br>us.apple_raw: 11.4<br>tier=tier_1 | 0.0 / 93.5 | — (not covered) | E12, E4, unclassified|
| n5k_0008 | salada de folhas (raw)<br>frango empanado (baked or fried)<br>polenta (fried) | salada de folhas → none<br>frango empanado → none<br>polenta → none | salada de folhas → ABSTAIN<br>frango empanado → ABSTAIN<br>polenta → ABSTAIN<br>route=ask | — | us.chicken_breast_grilled: 48.5<br>us.olive_oil: 1.0<br>tier=tier_1 | 0.0 / 88.5 | — (not covered) | E12, E4, unclassified|
| n5k_0009 | pork (fried)<br>tofu (pan-fried)<br>maíz (boiled)<br>salad (raw) | pork → none<br>tofu → none<br>maíz → none<br>salad → none | pork → ABSTAIN<br>tofu → ABSTAIN<br>maíz → ABSTAIN<br>salad → ABSTAIN<br>route=ask | — | us.olive_oil: 2.6<br>us.rice_white_cooked: 9.4<br>tier=tier_1 | 0.0 / 35.3 | — (not covered) | E12, E4, unclassified|
| n5k_0010 | tofu (pan-fried)<br>beef (cooked)<br>rice (boiled)<br>tomatoes (roasted)<br>mushrooms (sauted) | tofu → none<br>beef → none<br>rice → us.rice_white_cooked [1.000]<br>tomatoes → none<br>mushrooms → none | tofu → ABSTAIN<br>beef → ABSTAIN<br>rice → us.rice_white_cooked<br>tomatoes → ABSTAIN<br>mushrooms → ABSTAIN<br>route=ask | us.rice_white_cooked: 158.0 (102.7–229.1) | us.rice_white_cooked: 5.4<br>tier=tier_1 | 205.4 / 7.1 | — (not covered) | E12, E7, unclassified|
| n5k_0011 | coleslaw (raw)<br>potatoes (roasted)<br>meat (roasted)<br>romanesco broccoli (steamed) | coleslaw → none<br>potatoes → none<br>meat → us.bread_whole_wheat [0.177]<br>romanesco broccoli → none | coleslaw → ABSTAIN<br>potatoes → ABSTAIN<br>meat → ABSTAIN<br>romanesco broccoli → ABSTAIN<br>route=ask | — | us.olive_oil: 1.1<br>us.rice_white_cooked: 4.3<br>tier=tier_1 | 0.0 / 15.2 | — (not covered) | E12, E4, unclassified|
| n5k_0012 | rice with meat (cooked)<br>green salad (raw) | rice with meat → us.rice_white_cooked [0.274]<br>green salad → none | rice with meat → ABSTAIN<br>green salad → ABSTAIN<br>route=ask | — | us.rice_white_cooked: 25.8<br>us.olive_oil: 6.4<br>tier=tier_1 | 0.0 / 90.3 | — (not covered) | E12, E4, unclassified|
| n5k_0013 | chicken breast (baked)<br>broccoli (steamed)<br>arugula salad (raw)<br>chickpeas (boiled) | chicken breast → us.chicken_breast_grilled [1.000]<br>broccoli → none<br>arugula salad → none<br>chickpeas → us.chicken_breast_grilled [0.227] | chicken breast → us.chicken_breast_grilled<br>broccoli → ABSTAIN<br>arugula salad → ABSTAIN<br>chickpeas → ABSTAIN<br>route=ask | us.chicken_breast_grilled: 120.0 (90.0–162.0) | us.rice_white_cooked: 10.2<br>us.olive_oil: 4.0<br>tier=tier_1 | 198.0 / 48.8 | — (not covered) | E12, E3, E4, unclassified|
| n5k_0014 | biryani (cooked)<br>fish (fried)<br>long beans (cooked)<br>chickpea salad (raw) | biryani → none<br>fish → none<br>long beans → none<br>chickpea salad → none | biryani → ABSTAIN<br>fish → ABSTAIN<br>long beans → ABSTAIN<br>chickpea salad → ABSTAIN<br>route=ask | — | us.olive_oil: 11.5<br>us.rice_white_cooked: 27.4<br>tier=tier_1 | 0.0 / 137.7 | — (not covered) | E12, E4, unclassified|
| n5k_0015 | Caesar salad (raw)<br>lasagna (baked)<br>salmon (baked)<br>zucchini (steamed)<br>yellow squash (steamed) | caesar salad → none<br>lasagna → none<br>salmon → none<br>zucchini → none<br>yellow squash → none | caesar salad → ABSTAIN<br>lasagna → ABSTAIN<br>salmon → ABSTAIN<br>zucchini → ABSTAIN<br>yellow squash → ABSTAIN<br>route=ask | — | us.olive_oil: 5.1<br>tier=tier_1 | 0.0 / 44.7 | — (not covered) | E12, E4, unclassified|
| n5k_0016 | lasagna (baked)<br>salmon (baked) | lasagna → none<br>salmon → none | lasagna → ABSTAIN<br>salmon → ABSTAIN<br>route=ask | — | us.olive_oil: 4.1<br>tier=tier_1 | 0.0 / 36.4 | — (not covered) | E12, E4, unclassified|
| n5k_0017 | salmon (pan-fried)<br>roasted potatoes (roasted)<br>chicken (shredded)<br>tortilla de patatas (fried) | salmon → none<br>roasted potatoes → none<br>chicken → us.chicken_breast_grilled [1.000]<br>tortilla de patatas → none | salmon → ABSTAIN<br>roasted potatoes → ABSTAIN<br>chicken → us.chicken_breast_grilled<br>tortilla de patatas → ABSTAIN<br>route=ask | us.chicken_breast_grilled: 120.0 (78.0–174.0) | us.olive_oil: 3.9<br>tier=tier_1 | 198.0 / 34.3 | — (not covered) | E12, E3, E4, unclassified|
| n5k_0018 | Brussels sprouts (roasted)<br>chicken and rice (mixed)<br>zucchini (sauteed) | brussels sprouts → none<br>chicken and rice → us.chicken_breast_grilled [0.389], us.rice_white_cooked [0.241]<br>zucchini → none | brussels sprouts → ABSTAIN<br>chicken and rice → us.chicken_breast_grilled<br>zucchini → ABSTAIN<br>route=ask | us.chicken_breast_grilled: 120.0 (78.0–174.0) | us.olive_oil: 5.1<br>us.rice_white_cooked: 81.8<br>tier=tier_1 | 198.0 / 151.6 | — (not covered) | E12, E3, unclassified|

`E-code` is derived only from observable fields. In the fresh V3 run on **n=25**,
the harness reports `E3=6`, `E4=16`, `E12=20`, and `unclassified=19` sample
tags. `unclassified` deliberately remains beside E3/E4/E7 where the aggregate
cannot establish the more specific cause; these tags are not mutually exclusive.

### APE distribution and counterfactuals

On **n=25**, only **n=2** covered rows with positive-calorie truth enter the
APE distribution below; both are western samples.

| Rank | Sample | APE | Share of summed APE |
|---:|---|---:|---:|
| 1 | n5k_0002 | 25.4% | 100.0% |
| 2 | pkg_0001 | 0.0% | 0.0% |

The two counterfactuals use the same covered, positive-calorie denominator and
require exact identity alignment. They do not invent grams for identity-only
truth or apply truth mass to an unrelated food.

| Counterfactual | MAPE | n | Eligible samples |
|---|---:|---:|---|
| Perfect identity; observed grams only | 12.69% | 2 | n5k_0002, pkg_0001 |
| Perfect grams; observed identity only | 0.00% | 2 | n5k_0002, pkg_0001 |

No covered positive-calorie row has an identity mismatch. On **n=25**, both
counterfactuals still use the same two eligible rows: perfect identity with
observed grams is **12.69% MAPE**, while perfect grams with observed identity is
**0.00% MAPE**. Portion error therefore does not survive this refresh as a
finding: `pkg_0001` is now 0.0% APE. This is not evidence that portion handling
is solved generally; it means the 25-sample set has only **n=2** scorable
positive-calorie rows and no identity-mismatched covered row.

### Why V3 answered only 20% of meals

Fresh V3 coverage is **20% of n=25**, so **n=20** samples asked rather than
committed. Classification uses the actual retrieval output and the unchanged
`MIN_ACCEPT_SCORE=0.34` resolver threshold:

| Blocking evidence among n=20 deferred samples | Samples | Meaning |
|---|---:|---|
| At least one perceived food returned no candidate | 19 | Catalogue miss: no matching canonical entry surfaced. |
| At least one candidate existed but best score was below 0.34 | 3 | In-catalogue weak match: resolver abstained below acceptance threshold. |
| Both conditions above | 3 | Mixed blocker; counted in both evidence columns, not double-counted as extra meals. |
| Neither condition | 1 | `trap_0001` empty input; not a food-retrieval failure. |

The mutually exclusive primary decomposition is therefore **16 catalogue-only,
3 mixed catalogue-plus-threshold, 0 threshold-only, and 1 empty** out of
**n=20** deferred samples. Catalogue coverage is the dominant observed blocker
in this set; the three weak matches are `meat` (0.177), `rice with meat`
(0.274), and `chickpeas` (0.227), each below the same 0.34 threshold. No
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
unchanged here; this evaluator fix does not reset it. The historical 25-sample
decomposition above remains useful context, while current scorecards replay
**n=80** and expose complete-positive-truth eligibility separately from
coverage. Identity-only rows carry Tier 3 portion truth and do not support
calorie claims.
