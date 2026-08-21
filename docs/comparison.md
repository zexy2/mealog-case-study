# mealog compared with EatBetter

This is a comparative answer, not a claim that one product wins every
dimension. It uses EatBetter's public App Store positioning and review patterns;
it does not infer anything about EatBetter's internal model, catalogue, or
storage. Each section states what is better, why, how it is measured, and the
example that makes the difference concrete.

## 1. Closed-set resolution instead of prompted confidence

**What is better.** mealog makes hallucinated food identifiers structurally
impossible: resolution returns a catalogue `food_id` from the candidate set or
`ABSTAIN`. Nutrition is then computed from that identifier, not from a model's
free-form calorie answer.

**Why it is better.** This is [D1](decisions.md#d1--the-model-never-produces-a-nutrient-number)
implemented at the resolver boundary, so it does not depend on a prompt behaving
well. The trade-off is explicit: an item outside the locale pack is a miss and
can only be deferred, rather than silently turned into a plausible food.

**How it is measured.** The golden-set harness reports the observable `E3`
error distribution, and the retrieval harness separately measures false accepts
on negative queries. The committed golden set has one empty-plate trap; the
menu-photograph and screenshot trap rows requested for the full refresh are not
yet present, so the complete trap-set E3 rate is
`<!-- NUMBER: pending measurement refresh -->`.

**Example.** `trap_0001` has empty truth and is routed to `ask`, while
`test_resolution_is_closed_set.py` proves an unknown query returns `ABSTAIN` or
a food already in the pack. A wrong identifier cannot be invented to make the
coverage number look better.

## 2. Abstention instead of a silent wrong log

**What is better.** When retrieval cannot support a safe match, mealog asks or
abstains instead of committing a silent food entry. EatBetter's [public App
Store listing](https://apps.apple.com/us/app/eatbetter-ai-food-journal/id6639614109?platform=ipad)
promises a deliberately low-friction experience — “No tedious logging — just
scan” — so this is a different product choice, not a claim about its
implementation.

**Why it is better.** [D3](decisions.md#d3--headline-metric-is-the-worst-cuisine-and-accuracy-is-read-with-coverage)
reads accuracy beside coverage. A deferred answer is visible to the user and
does not become a false calorie record; the cost is that fewer meals are
automatically logged.

**How it is measured.** The current nine-sample V3 replay reports 56% overall
coverage and 12.69% western MAPE after the packaged-serving correction; both
figures are recorded in the [#94 measurement log](../log/2026-08-21-1323-codex-packaged-serving.md).
The denominator is covered samples only, as defined by `eval/metrics.py`.

**Example.** Both committed `ja_JP` samples expose the cost: `jp_0001` asks
after tomato salad and tsukemono abstain, while `jp_0002` abstains all three
uncovered items and asks. The system loses coverage rather than writing a
confident Japanese food that the pack does not contain.

## 3. Portion as a distribution, not a point

**What is better.** mealog returns median `grams` with `p10`/`p90`, and the band
is narrower when the evidence is stronger. A printed serving or net weight is
marked as label evidence; an assumed or unknown-density portion remains visibly
uncertain.

**Why it is better.** [D7](decisions.md#d7--portion-is-a-distribution-and-density-belongs-to-the-food)
keeps portion uncertainty in both the review UI and the confidence gate. This
matches the useful part of the EatBetter App Store's public review pattern —
reviewers say portions can be off but editing is quick — while making the
uncertainty visible before the user edits it.

**How it is measured.** The [packaged-serving measurement](../log/2026-08-21-1323-codex-packaged-serving.md)
compares the same offline fixture before and after #94: `pkg_0001` changed from
907.2 g with 433.6% APE to 170.0 g with 0.0% APE, and its p10–p90 band changed
from 725.8–1134.0 g to 153.0–187.0 g. Those first values are the historical
pre-fix diagnostic, not current results.

**Example.** `pkg_0001` is Greek yogurt with a printed 170 g serving. The label
serving now drives the estimate; the current V3 western MAPE is 12.69%, rather
than the stale pre-#94 229.49% diagnostic. `n5k_0002` is the control: its
100.0 g estimate and 25.4% APE do not move.

## 4. Per-cuisine accuracy with the worst bucket as the headline

**What is better.** mealog reports the distribution of performance by cuisine
and leads with the worst cuisine bucket, rather than hiding the weakest market
inside one mean. It is a measurement surface for market expansion, not an
assertion that EatBetter's product team lacks one.

**Why it is better.** Cuisine shift is the risk this project is meant to expose.
The mean can improve while a new market becomes unusable, so [D3](decisions.md#d3--headline-metric-is-the-worst-cuisine-and-accuracy-is-read-with-coverage)
requires the worst MAPE, coverage, and the spread to be read together.

**How it is measured.** `eval/harness.py` emits per-cuisine `n`, coverage, Item
F1, kcal MAPE, within-20% and FP rate, and CI compares each selected cuisine
bucket against the stored baseline. The current V3 worst bucket is western at
12.69% MAPE; the current per-cuisine table is refreshed by the harness rather
than copied from the stale decomposition in `docs/evaluation.md`.

**Example.** The two east-Asian golden samples have 0% V3 coverage because the
Japanese pack cannot resolve all their items, while western `pkg_0001` became a
measurable portion fix after its label serving was added. Those are two
different failure modes that one aggregate number would conflate.

## 5. An inspectable decision trace

**What is better.** The reviewer path exposes the matched canonical record,
alternates, confidence, exact grams, and the portion interval instead of only a
calorie total. The locale pack also retains its nutrition source and licence,
so the calculation has a traceable input boundary.

**Why it is better.** A user can challenge the identity or portion at the point
where it matters. This makes an answer reviewable and correctable; it is not a
claim that EatBetter has no equivalent affordance, and it is not a claim of a
durable audit database that this take-home does not ship.

**How it is measured.** The contract is visible in `ResolvedItem` and the
mobile `ReviewScreen`: `food_id`, `candidates`, `confidence`, `grams`,
`grams_p10`, and `grams_p90` are rendered by the audit panel. The demo also
provides `source_database`; the live server currently keeps pack source and
licence outside that optional UI field, so a durable source-version audit trail
is `<!-- NUMBER: pending measurement refresh -->` rather than an invented
completeness percentage.

**Example.** The demo `pilav` item shows three candidate IDs with scores 0.92,
0.41, and 0.32, 180 g with a 135–245 g band, 78% confidence, and `TURKOMP` as
the source database. The reviewer can see what would change before saving.

## 6. User-scoped idempotent logging

**What is better.** A retry with the same client-generated key returns the same
meal for that user and does not run the pipeline twice. The same key issued by
two users is not treated as the same meal.

**Why it is better.** This addresses the review pattern in the [EatBetter App
Store listing](https://apps.apple.com/us/app/eatbetter-ai-food-journal/id6639614109?platform=ipad)
of meals appearing to log inconsistently across sessions, without claiming that
a review proves an EatBetter defect. The server cache key is
`(user_id, idempotency_key)`, so a network retry is a correctness case rather
than a duplicate-meal lottery.

**How it is measured.** `server/tests/test_idempotency.py` asserts identical
replay bodies, one pipeline call for multipart replay, and distinct results for
the same key from different users. A head-to-head session-loss rate for
EatBetter is `<!-- NUMBER: pending measurement refresh -->`; the public review
pattern is qualitative evidence, not that benchmark.

**Example.** The test sends `shared-key` as `user-a` for `tr_0001` and as
`user-b` for `tr_0002`; both requests survive with different results. A second
multipart submission of the same image returns the first body and leaves the
pipeline call count at one.

## 7. Nutrition provenance and licence enforcement

**What is better.** Nutrition values are attached to canonical records with a
declared source, and each locale pack declares a licence that the loader checks
at runtime. This is stronger than treating a database name as documentation
after the value has already entered a log.

**Why it is better.** A reviewer can ask where a `per_100g` value came from and
whether the pack may be served in the target mode. [D2](decisions.md#d2--a-locale-is-a-data-pack-not-code)
keeps that legal boundary in data, and #46 makes the restricted-pack decision a
runtime refusal rather than a CI-only warning.

**How it is measured.** `scripts/check_invariants.py` checks every pack's
`nutrition_source`, cuisine, and licence vocabulary; `test_locale_packs.py`
checks runtime refusal in commercial mode. The current tree contains 69
canonical foods across three locale packs: USDA FoodData Central is public
domain, TÜRKOMP is restricted-noncommercial, and the Japanese source is
unverified.

**Example.** `load("tr", commercial_mode=True)` refuses the TÜRKOMP pack, while
the en_US USDA pack remains permitted. The fail-closed behavior is a legal and
data-provenance difference that can be exercised without a provider call.

## Where EatBetter is better: catalogue coverage

**What is better.** EatBetter is better on practical catalogue breadth: its
[public product positioning](https://apps.apple.com/us/app/eatbetter-ai-food-journal/id6639614109?platform=ipad)
is to scan meals without manual logging, while
mealog currently carries 69 canonical foods across three locale packs and must
abstain outside them. I am not claiming an EatBetter catalogue count or an
internal matching policy.

**Why it is better.** A long-tail meal that is absent from our pack creates a
question or an abstention, which is real user friction even when it prevents a
wrong calorie record. This is the direct cost of our closed-set guarantee, not a
reason to hide the coverage gap.

**How it is measured.** We count canonical IDs from `STATUS.md` and measure
coverage, recall, and false accepts on the repository's golden and retrieval
sets. The current retrieval run over 145 variants reports 100.0% Recall@1 and
Recall@5, 99.2% Accept@1, and 0/22 false accepts; those are surface-form tests,
not proof of 69-food long-tail coverage. EatBetter's comparable catalogue
coverage is `<!-- NUMBER: pending measurement refresh -->`.

**Example.** `jp_0002` contains foods the `ja_JP` pack does not carry, so all
three items abstain. `çay` likewise surfaces the dry-tea neighbour and its
dry-leaf `per_100g` record but still abstains, and `baked beans` is kept apart from Turkish `kuru fasulye`; the
negative-alias tests show the guardrail, while EatBetter's broader scan-first
experience has the coverage advantage.

## Failure cases that make the comparison concrete

**What is better.** mealog turns failure into a visible, testable state rather
than a polished number whose provenance is unclear. That does not mean every
failure is solved: the examples separate portion, catalogue, and regional
confusion errors.

**Why it is better.** A reviewer can see what to fix next — product serving
evidence, a missing locale item, or a negative alias — and can distinguish an
honest abstention from a wrong match.

**How it is measured.** The current offline harness and retrieval evaluation
are deterministic and provider-free. The retrieval set grew with the Turkish
catalogue from 8 to 53 foods; [#99](https://github.com/zexy2/mealog-case-study/pull/99)
records the resulting 145-variant measurement and the negative/confusion guard.

**Example.** The four representative cases are: `pkg_0001` (historical
433.6% APE before the label-serving fix, current 0.0%); `çay` matched against
dry tea leaves until the negative-alias case forced an abstention; `baked beans`
versus `kuru fasulye`, where the E10-style regional trap is surfaced and
abstained; and the two `ja_JP` samples, where missing coverage produces asks.

## What external accuracy numbers can and cannot tell us

**What is better.** The defensible improvement is our measurement discipline,
not a claim that this repository beats a published benchmark. External results
are context for choosing a test design; they are not interchangeable scores.

**Why it is better.** The public evidence spans incompatible tasks and quality
levels: an independent review reports pooled per-meal energy MAPE around 18.7%,
a controlled-kitchen app study reports roughly one-third calorie
underestimation, and vendor-adjacent benchmark pages claim roughly 1–5%.
Presenting that spread honestly is a reason to measure the same inputs, labels,
coverage rule, and worst-cuisine headline here.

**How it is measured.** The 18.7% figure is from the [independent systematic
review](https://www.dietaryassessmentinitiative.org/publications/image-based-systematic-review-2025/).
The one-third result is from an [American Society for Nutrition study release](https://www.eurekalert.org/news-releases/1136415),
which explicitly says the abstract has not generally undergone journal peer
review. The 1–5% range is a [vendor-adjacent benchmark claim](https://www.clinicalnutritionreport.com/research/ai-photo-calorie-benchmark-2026/),
not peer-reviewed evidence, so it is not a target or baseline for mealog. Our current V3 replay is
the repository's own 12.69% worst-cuisine MAPE at 56% coverage on nine samples,
with the small label-tier boundary documented in `docs/evaluation.md`.

**Example.** `pkg_0001` demonstrates why a headline without a portion audit is
misleading: the same identity moved from a historical 433.6% APE to 0.0% after
the product's printed serving was sourced. That is a repository measurement,
not evidence that the external 18.7%, one-third, or 1–5% figures apply to this
system.
