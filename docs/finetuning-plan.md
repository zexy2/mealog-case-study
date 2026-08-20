# Fine-tuning plan — chosen path and explicit non-results

The chosen AI path is **hybrid: rules + retrieval + a frontier VLM**. Fine-tuning is
an optional, bounded improvement to one part of that system, not a replacement for
the closed-set and catalogue guarantees. The training boundary is fixed by
[D8](decisions.md#d8--one-component-fine-tuned-one-specified-and-not-trained); this
document is the experiment specification for that decision, not evidence that an
experiment happened.

> **Status at this commit: nothing is trained.** There is no checkpoint, adapter,
> prepared training release, loss curve, learning curve, measured accuracy, GPU-hour
> total, or training spend to report. The two sections below are plans. Any future
> execution must add a run manifest, data hash, configuration, hardware, cost,
> checkpoint hash, and held-out metrics before it can be described as a result.

## What the plan is trying to improve

The system has two different uncertainties:

1. **Identity:** does an image correspond to a food in the canonical catalogue?
2. **Mass:** how many grams of that identified food are present?

The locale adapter addresses identity by joining visual retrieval to the existing
canonical embedding space. The mass regressor addresses portion uncertainty by
predicting a distribution over grams. Neither component may generate a free-text
food ID or a nutrient number: the existing closed-set resolver and
`pipeline/nutrition.py` remain the authorities for those decisions.

Published evidence says these are different problems. A recent Nutrition5k VLM
benchmark reports Gemini 3.0 Flash at **80.7 kcal MAE** and **CCC 0.767** on its
benchmark. Those are external baseline results, not results from this repository and
not a promise about our data. The same benchmark found that correcting omissions in
Nutrition5k labels changed an extrapolated ingredient-overlap estimate from **0.62
to 0.82**; that is also external evidence, not a score for a model trained here.
See the [benchmark preprint](https://doi.org/10.64898/2026.07.26.740845).

---

## FT-1 — Nutrition5k mass regressor: specified, deliberately not trained

### Data contract

The proposed training rows are an overhead RGB image paired with a canonical food
candidate and its scale-weighed mass in grams. The source is
[Google Research's Nutrition5k release](https://github.com/google-research-datasets/Nutrition5k):

- The release contains per-ingredient masses, ingredient metadata, overhead RGB-D
  captures, and official dish-ID train/test splits. The split keeps incremental scans
  of one plate together, preventing near-duplicate frames from crossing the boundary.
- The complete archive is **181.4 GB**. The experiment needs only the overhead RGB
  images plus the dish/ingredient metadata; it does not need to download the full
  side-angle video archive or depth data for the first version.
- The official evaluation helper computes absolute and percentage mean errors from
  per-dish predictions. A training run would use the official test split unchanged
  and carve validation only from the official training IDs.
- Ingredient names must be mapped to the repository's canonical food IDs before
  training. Unmapped or ambiguous rows are retained in an audit file and excluded
  from the supervised loss; silently treating them as a different food would turn
  catalogue uncertainty into label noise.

The dataset's collection and split details are documented in the
[Nutrition5k paper](https://arxiv.org/abs/2103.03375). No copy of the dataset,
prepared rows, or image is committed here.

### Proposed model

Use a frozen image backbone and a small trainable head. For each image/candidate
pair, the head receives the frozen visual representation and the candidate's
canonical embedding, then emits three ordered values:

```text
q10, q50, q90  ->  predicted grams for the candidate food
```

The objective is quantile regression, not a point estimate. For quantiles
`Q = {0.10, 0.50, 0.90}`, the proposed loss is the mean pinball loss:

```text
L = mean(q in Q, rows)(rho_q(actual_grams - predicted_q))
```

The implementation must enforce `q10 <= q50 <= q90` either through a monotonic
parameterisation or a documented crossing penalty. The p50 feeds the portion
estimate; the p10–p90 interval feeds the existing confidence gate. This makes
uncertainty a model output rather than a fixed spread bolted onto a point estimate.

The head predicts grams only. It does not predict calories, macros, a catalogue ID,
or a user-facing answer. The downstream pipeline continues to scale catalogue
nutrition from the resolved food and the predicted portion distribution.

### Evaluation protocol

The pre-registered report would contain:

- mass MAE and MAPE on the official test split, reported per ingredient family and
  per dish;
- empirical coverage of the p10–p90 interval, its median width, and calibration
  plots, so a wide interval is not mistaken for accuracy;
- end-to-end calorie MAE and CCC after passing the predicted grams through the
  existing catalogue nutrition function; and
- a comparison with the published Gemini 3.0 Flash reference above on the same
  images and metric definitions where the benchmark permits a like-for-like check.

The 80.7 kcal MAE / 0.767 CCC row is a **published comparator**. This repository
has not reproduced it, improved it, or measured a regression against it.

### Label noise is a first-class risk

The benchmark's human validation reviewed 440 images with four annotators and found
systematic omissions in the original ingredient labels. After correction, the
extrapolated ingredient-overlap estimate moved from 0.62 to 0.82. Those figures are
published findings, not training labels or evaluation results produced here.

Before any training run, the data audit would:

1. sample rows from every split and ingredient-frequency band;
2. record missing, visually unsupported, duplicated, and unmappable ingredients;
3. hand-verify a fixed audit subset without changing the official test labels; and
4. report raw-label and audit-corrected analyses separately if corrections are
   permitted.

A model trained on unreviewed omissions could learn the dataset's errors and present
them as accuracy. If the audit cannot establish a defensible label policy, the
correct outcome is not to train this component.

### Compute, cost, and the reason for deferral

These are **projections and stop conditions**, not measurements:

- Data preparation is bounded to the overhead subset, with cached frozen embeddings
  and no end-to-end backbone update.
- A pilot would first verify that the frozen embeddings, candidate pairs, quantile
  head, and official evaluator fit on one rented GPU. Only a successful pilot would
  justify a full head-only run; no GPU type, duration, or provider price is claimed
  before that measurement.
- Actual training spend and GPU-hours are currently **zero**. A future cost report
  must show `provider rate × GPU-hours + storage/egress`, with receipts or run-log
  evidence. A made-up dollar estimate would be less honest than an explicit unknown.
- The mass problem is open research, and a rushed regressor can lose to the strong
  frontier reference while creating an apparently impressive but weak artefact. In
  this six-day take-home, a plan with a fixed data contract, quantile objective,
  noise audit, and rejection criteria is more useful than an unverified negative
  experiment.

The component therefore remains specified and deliberately not trained. No model
artifact or negative/positive result is implied by this section.

---

## FT-2 — Locale adapter: planned training component, not trained yet

### Corpus and sampling

The adapter corpus is deliberately mixed so that a market-specific gain is visible
instead of hidden in one aggregate score:

- **Food-101:** Western and multi-ethnic single-food images;
- **UEC-Food 256:** East Asian food classes and multi-item plates; and
- **TurkishFoods-15:** Turkish dishes needed to test the local-market seam.

Before a run, each dataset would receive a license/access audit and a deterministic
mapping from its labels to canonical catalogue IDs. Images would be sub-sampled to
a fixed number per class, with the cap and random seed recorded before looking at
test results. A proposed learning-curve grid is **25, 50, 100, and 200 images per
class**; these are protocol settings, not observed performance. Official or
dataset-provided splits are kept where available, and near-duplicate images from
the same source plate must not cross train and test.

UEC multi-item images may have several positive catalogue foods. They are represented
as multiple positive image-to-food pairs for the contrastive objective, rather than
forced into one arbitrary class.

### Method: visual retrieval into the canonical space

The adapter does not become a new classifier and does not generate food names. The
proposed method is:

1. keep the base image encoder frozen;
2. keep the canonical food/text embedding space fixed;
3. train a small projection adapter from image embeddings into that space;
4. use an in-batch contrastive loss with the mapped canonical food as the positive
   and other catalogue foods as negatives; and
5. retrieve catalogue candidates by embedding score, then use the existing resolver
   and abstention rules.

This keeps the visual path inside the same closed set as text retrieval. An image
cannot create a free-text food ID, and a high similarity score is still only a
candidate until the existing resolution and confidence stages accept it.

### Per-cuisine report and learning curve

Every run would compare the frozen baseline encoder with the adapter using held-out
images and the same catalogue. The report must include, by cuisine and dataset:

- Recall@1 and Recall@5 for single-item images;
- macro item recall/precision/F1 for multi-item plates;
- abstention/acceptance rate after the existing resolver; and
- the absolute gain from the adapter, with uncertainty intervals and the exact
  images-per-class cap.

The learning curve is the required market-expansion measurement: for each proposed
cap (`25/50/100/200` images per class), plot per-cuisine accuracy against added
images and record the marginal data and labeling cost. The baseline and every
adapter point must use the same held-out set; no test point may be used to choose
the cap or tune the acceptance threshold.

There are currently **no curve points, no per-cuisine gains, no cost estimate, and
no adapter checkpoint**. Those blanks are intentional. The future report must not
replace them with projected accuracy.

### Go/no-go criteria

If this component is eventually run, it is eligible for integration only after:

- the held-out per-cuisine report is complete;
- no cuisine regresses against the frozen baseline without an explicitly reviewed
  explanation;
- multi-item and abstention behaviour is reported separately from top-1 accuracy;
- the adapter's catalogue mappings and dataset licenses are auditable; and
- a run manifest, checkpoint hash, and reproducible evaluation command exist.

Until those conditions are met, the adapter is a proposal, not a trained component
and not a product result.

---

## What would make a future result admissible

No future sentence should say “the model improved” without all of the following:

- immutable dataset and mapping hashes;
- train/validation/test IDs and leakage checks;
- model/backbone and hyperparameters;
- random seeds and hardware/provider details;
- checkpoint hash and training/evaluation logs;
- per-cuisine metrics, coverage/abstention, and uncertainty calibration; and
- actual GPU time and spend.

Until such evidence exists, the only accurate status is the one at the top of this
document: **nothing is trained**.

## References

- [Decision D8](decisions.md#d8--one-component-fine-tuned-one-specified-and-not-trained)
- [Nutrition5k official release and evaluation scripts](https://github.com/google-research-datasets/Nutrition5k)
- [Nutrition5k paper](https://arxiv.org/abs/2103.03375)
- [VLM dietary-assessment benchmark](https://doi.org/10.64898/2026.07.26.740845)
