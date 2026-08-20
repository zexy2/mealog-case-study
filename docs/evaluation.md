# Evaluation methodology

This document describes the measurement system that is implemented by
`eval/metrics.py` and rendered by `eval/harness.py`. `make eval` replays the
recorded fixtures offline; the live-provider path is separate as required by
[D4](decisions.md#d4--offline-reproducible-evaluation-via-recorded-fixtures).

## Golden set

Each line in `eval/golden/manifest.jsonl` is one sample. It carries a cuisine
bucket, a ground-truth tier, and truth items as `food_id` plus grams. The
harness derives truth calories from the catalogue before scoring them. Traps
have empty truth; they are scored on identity rather than calorie error.

Every sample carries one of these ground-truth tiers:

| Tier | Meaning |
|---|---|
| Tier 1 | Packaged label or lab/scale-weighed source, including Nutrition5k |
| Tier 2 | Self-cooked food measured with a kitchen scale and per-ingredient computation |
| Tier 3 | Two-rater consensus estimate, with disagreement recorded |

An error against a Tier 3 label is weaker evidence than the same error against
a Tier 1 label. Tiers are never silently combined: the harness reports the
same evaluation by ground-truth tier as well as by cuisine.

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

## Not yet measured

> **Input state today:** all recorded fixtures are synthetic placeholders. No
> number in `eval/reports/` is yet a claim about how accurately the system
> reads a real plate. That changes when [#3](../../issues/3) records real
> provider responses and [#2](../../issues/2) grows the golden set.
