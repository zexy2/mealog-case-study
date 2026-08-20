# Evaluation methodology

## Why this exists before the model does

Accuracy claims without a measurement system are marketing. The harness was the
first thing built; every pipeline change since has been justified by a row in the
ablation table.

## Golden set

Target **n≈80**, stratified across the six cuisine buckets used by the Dietary
Assessment Initiative's distribution-shift work — reused verbatim so the numbers
are comparable to published evaluations rather than being a private taxonomy.

| Stratum | Target n | Ground truth |
|---|---:|---|
| Weighed reference sample (Nutrition5k) | ~30 | **Tier 1** — scale-measured per-ingredient mass |
| Packaged / branded | ~15 | **Tier 1** — printed label |
| Self-cooked | ~20 | **Tier 2** — kitchen scale + per-ingredient computation |
| Restaurant / regional (East, South Asian, Latin) | ~10 | **Tier 2** — published menu values |
| Traps (non-food, empty plate, menu photo) | ~8 | definitional |

Using a public weighed dataset as **evaluation** data (not training data) buys two
things cheaply: uncontestable ground truth, and direct comparability with published
VLM baselines on the same dishes.

**Ground-truth uncertainty is reported, not hidden.** Tier is carried on every
sample and every metric can be sliced by it. Published work has found label
omissions in widely used food datasets large enough to move measured ingredient
overlap from 0.62 to 0.82 after correction — so a subset of Tier 1 labels is
hand-verified and the disagreement rate is published.

## Metrics

| Family | Metric | Why |
|---|---|---|
| Identity | item P / R / F1 over `food_id` | what was eaten |
| Identity | false-positive rate | hallucination, once resolution is closed-set |
| Retrieval | Recall@1 / @5 | isolates the matcher from the resolver |
| Mass | gram MAE / MAPE | the dominant calorie error source |
| Outcome | kcal MAPE, **within ±20%** | ±20% is what a user feels; MAPE is what we tune |
| Trust | coverage, abstention rate, accuracy-under-coverage | risk–coverage trade |
| Ops | p50/p95 stage latency, cost per log | unit economics of the feature |

Aggregation is **per cuisine**, reported worst-first.

## Error taxonomy

`E1`–`E12`, defined in `server/src/mealog/domain/taxonomy.py` as a real enum so
production logs and offline evals use the same vocabulary. Every failure is
auto-tagged and hand-confirmed, which turns "how would you improve accuracy next"
into a data question: the top three fixes are whichever codes own the largest share
of the calorie error budget.

Two groupings matter: `PORTION_CODES` splits the error budget between *what it is*
and *how much of it*; `CLOSED_SET_VIOLATIONS` should be empty after V1 — if `E3`
appears, that is a resolver bug, not model misbehaviour.

## Ablation

| Config | Adds |
|---|---|
| V0 | single-prompt VLM reporting calories directly — the baseline to beat |
| V1 | closed-set resolution + computed nutrition |
| V2 | locale text and unit normalization |
| V3 | confidence gating and abstention |

Each row must pay for itself on worst-bucket MAPE, spread, or hallucination rate.

## Regression guard

`python eval/harness.py --check-regression` compares per-bucket MAPE against a
stored baseline and fails on **any** bucket that got worse. Runs in CI. This is the
guard against the failure mode a multi-market product fears most: improving one
market at the silent expense of another.
