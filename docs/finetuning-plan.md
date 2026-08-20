# Fine-tuning: what I trained, what I did not, and why

The brief offers three AI paths and asks for one, gone deep. **The chosen path is
hybrid (rules + retrieval + LLM).** Fine-tuning is not a fourth path here — it is
how one component of the hybrid gets better.

The decision that matters is *which* component. Published benchmarking of ten VLMs
on a weighed-reference dataset shows frontier models are reasonable at identifying
what is on a plate but carry roughly ~80 kcal mean absolute error per dish, and the
same literature reports that low-data fine-tuning of strong base models yields
limited gains. So the question is not "can I fine-tune a VLM" but "where is the
measured hole".

---

## Implemented — locale adapter (image → canonical embedding)

**What.** A lightweight adapter aligning food images to the canonical catalogue's
text-embedding space, trained on a **mixed multi-cuisine corpus** so the method is
market-agnostic and the per-market gain is measurable.

**Data.** Sub-sampled to ~200 images/class from public sets with existing splits:
Food-101 (101 classes, multi-ethnic), UEC-Food 256 (256 classes, East Asian,
includes multi-item images), TurkishFoods-15 (15 classes).

**Why this component.** It sits inside retrieval, so an improvement propagates
through resolution without weakening the closed-set guarantee. It trains in minutes
on a free tier. And it produces the number that actually matters to a company
adding markets.

**Evaluation.** Recall@1/@5 against the canonical catalogue, **reported per
cuisine**, against the un-tuned encoder. Plus a learning curve — accuracy gain vs.
images-per-class — which converts "should we enter market N+1" into a cost estimate
rather than an opinion.

**Risks.** Public-dataset images are cleaner than user photos; the gain will
overstate production lift. Reported as such.

---

## Planned, not implemented — mass/portion regressor

**What.** A quantile regressor (p10/p50/p90 grams) on a frozen vision backbone,
trained on a weighed-reference dataset with official train/test splits and an
official evaluation script.

**Why it is the right next investment.** Mass, not identity, dominates calorie
error, and it is locale-independent — physics, not culture. It would improve every
market at once.

**Why not now.** The dataset is ~181 GB, needs a GPU, a dataloader and eval
integration: realistically 1.5–2 days with a meaningful chance of losing to the
frontier baseline. Spending that and reporting a negative result is worse than
spending it on measurement. In the meantime portion is attacked without training:
catalogue serving priors, the locale unit lexicon, user history, and asking one
targeted question when the band is too wide.

**Label noise is a first-class risk.** Human annotators have found omissions in this
dataset large enough to move measured ingredient overlap from 0.62 to 0.82 once
corrected. Training naively on it teaches the model the dataset's mistakes. Any
implementation must start with a hand-verified subset and publish the noise rate.

**Evaluation.** Gram MAE/MAPE on the official split, plus end-to-end kcal MAPE
through the pipeline, against both the frontier baseline and the published numbers
for the same dataset.

**Rollout.** Shadow-mode first: run alongside the current portion stage, log the
delta, promote only if it wins on worst-bucket MAPE without reducing coverage.
